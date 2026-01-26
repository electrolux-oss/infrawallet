function makeReportKey(orgName: string, productName: string, chargeType: string): string {
  return JSON.stringify({ orgName, productName, chargeType });
}

function parseReportKey(key: string): ReportKey {
  return JSON.parse(key);
}
import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { v2 as datadogApiV2, client as datadogClient } from '@datadog/datadog-api-client';
import moment from 'moment';
import { CLOUD_PROVIDER, GRANULARITY, PROVIDER_TYPE } from '../service/consts';
import { parseCost } from '../service/functions';
import { CostQuery, Report } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';
import { DatadogCostByOrgResponseSchema } from '../schemas/DatadogBilling';
import { ZodError } from 'zod';

type ReportKey = {
  orgName: string;
  productName: string;
  chargeType: string;
};

export class DatadogClient extends InfraWalletClient {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new DatadogClient(CLOUD_PROVIDER.DATADOG, config, database, cache, logger);
  }

  protected convertServiceName(serviceName: string): string {
    let convertedName = serviceName;

    // Datadog doesn't have this documented offically, raise a PR if any service is missed
    const aliases = new Map<string, string>([
      ['apm_host', 'APM Hosts'],
      ['apm_host_enterprise', 'APM Enterprise Hosts'],
      ['application_vulnerability_management_oss_host', 'Application Security - SCA Host'],
      ['application_security_host', 'ASM - Threat Management Hosts'],
      ['audit_trail', 'Audit Trail'],
      ['bits_ai_investigations', 'Bits AI SRE Investigations'],
      ['ci_pipeline', 'CI Visibility Committers'],
      ['ci_pipeline_indexed_spans', 'CI Visibility Spans'],
      ['cloud_cost_management', 'Cloud Cost Hosts'],
      ['cspm_container', 'Cloud Security Management Containers Pro'],
      ['cspm_host', 'Cloud Security Management Hosts Pro'],
      ['csm_container_pro', 'Cloud Security Management Pro Containers'],
      ['csm_host_pro', 'Cloud Security Management Pro Hosts'],
      ['cws_container', 'Workload Protection Containers'],
      ['cws_host', 'Workload Protection Hosts'],
      ['infra_container', 'Containers'],
      ['infra_container_excl_agent', 'Containers'],
      ['timeseries', 'Custom Metrics'],
      ['error_tracking', 'Error Tracking'],
      ['error_tracking_tiered', 'Error Tracking Events'],
      ['incident_management', 'Incident Management'],
      ['incident_management_seats', 'Incident Management'],
      ['llm_observability_min_spend', 'LLM Spans'],
      ['logs_indexed_15day', 'Indexed Logs (15 Day Retention)'],
      ['logs_indexed_180day', 'Indexed Logs (180 Day Retention)'],
      ['logs_indexed_1day', 'Indexed Logs (1 Day Retention)'],
      ['logs_indexed_30day', 'Indexed Logs (30 Day Retention)'],
      ['logs_indexed_360day', 'Indexed Logs (360 Day Retention)'],
      ['logs_indexed_3day', 'Indexed Logs (3 Day Retention)'],
      ['logs_indexed_45day', 'Indexed Logs (45 Day Retention)'],
      ['logs_indexed_60day', 'Indexed Logs (60 Day Retention)'],
      ['logs_indexed_7day', 'Indexed Logs (7 Day Retention)'],
      ['logs_indexed_90day', 'Indexed Logs (90 Day Retention)'],
      ['apm_trace_search', 'Indexed Spans'],
      ['infra_host', 'Infra Hosts'],
      ['logs_ingested', 'Ingested Logs'],
      ['ingested_spans', 'Ingested Spans'],
      ['iot', 'IoT Devices'],
      ['npm_host', 'Network Hosts'],
      ['prof_container', 'Profiled Containers'],
      ['prof_host', 'Profiled Hosts'],
      ['rum_lite', 'RUM Sessions'],
      ['rum_replay', 'RUM with Session Replay Sessions'],
      ['siem_indexed', 'Security Analyzed and Indexed Logs'],
      ['sensitive_data_scanner', 'Sensitive Data Scanner'],
      ['serverless_apps', 'Serverless App Instances'],
      ['serverless_apps_apm', 'Serverless Apps APM'],
      ['serverless_apm', 'Serverless Traced Invocations'],
      ['serverless_infra', 'Serverless Workload Functions'],
      ['siem', 'SIEM - Analyzed Logs'],
      ['synthetics_api_tests', 'Synthetics API Test Runs'],
      ['synthetics_browser_checks', 'Synthetics Browser Test Runs'],
      ['synthetics_mobile_app_testing', 'Synthetics Mobile App Test Runs'],
      ['ci_testing', 'Test Visibility Committers'],
      ['ci_test_indexed_spans', 'Test Visibility Spans'],
    ]);

    if (aliases.has(convertedName)) {
      convertedName = aliases.get(convertedName) || convertedName;
    }

    return `${this.provider}/${convertedName}`;
  }

  protected async initCloudClient(integrationConfig: any): Promise<any> {
    const apiKey = integrationConfig.getString('apiKey');
    const applicationKey = integrationConfig.getString('applicationKey');
    const ddSite = integrationConfig.getString('ddSite');
    const configuration = datadogClient.createConfiguration({
      baseServer: new datadogClient.BaseServerConfiguration(ddSite, {}),
      authMethods: {
        apiKeyAuth: apiKey,
        appKeyAuth: applicationKey,
      },
    });
    const client = new datadogApiV2.UsageMeteringApi(configuration);
    return client;
  }

  protected async fetchCosts(integrationConfig: Config, client: any, query: CostQuery): Promise<any> {
    const costData: datadogApiV2.CostByOrg[] = [];
    // Strict UTC to prevent month boundary drift
    const startTime = moment.utc(Number.parseInt(query.startTime, 10)).startOf('month');
    const endTime = moment.utc(Number.parseInt(query.endTime, 10)).startOf('month');
    const historicalCutoff = moment.utc().startOf('month').subtract(2, 'months');

    // check if costs prior to 2 months ago are in query, if yes, use historical_cost API
    // https://docs.datadoghq.com/api/latest/usage-metering/#get-historical-cost-across-your-account
    if (startTime.isBefore(historicalCutoff)) {
      const historicalEndTime = moment.min(endTime, historicalCutoff.clone().subtract(1, 'month'));
      // Datadog API quirk: To get data FOR a specific end month, the API request must include the NEXT month.
      const maxMonthRange = 3;
      let chunkStart = startTime.clone();

      while (chunkStart.isSameOrBefore(historicalEndTime)) {
        let chunkEnd = chunkStart.clone().add(maxMonthRange - 1, 'months');
        if (chunkEnd.isAfter(historicalEndTime)) {
          chunkEnd = historicalEndTime.clone();
        }

        const apiEndMonth = chunkEnd.clone().add(1, 'month');

        const historicalCost: datadogApiV2.CostByOrgResponse = await client.getHistoricalCostByOrg({
          startMonth: chunkStart,
          endMonth: apiEndMonth,
          view: 'sub-org',
        });

        try {
          DatadogCostByOrgResponseSchema.parse(historicalCost);
          this.logger.debug(`Datadog historical cost response validation passed`);
        } catch (error) {
          if (error instanceof ZodError) {
            this.logger.warn(`Datadog historical cost response validation failed: ${error.message}`);
            this.logger.debug(`Sample validation errors: ${JSON.stringify(error.errors.slice(0, 3))}`);
          } else {
            this.logger.warn(`Unexpected validation error: ${error.message}`);
          }
        }

        if (historicalCost.data) {
          costData.push(...historicalCost.data);
        }

        chunkStart = chunkStart.clone().add(maxMonthRange, 'months');
      }
    }

    // check if current/last month costs are in query, if yes, use estimated_cost API
    // https://docs.datadoghq.com/api/latest/usage-metering/#get-estimated-cost-across-your-account
    if (endTime.isSameOrAfter(historicalCutoff)) {
      const estimatedStartTime = moment.max(startTime, historicalCutoff);
      const apiEndTime = endTime.clone().add(1, 'month');

      const estimatedCost: datadogApiV2.CostByOrgResponse = await client.getEstimatedCostByOrg({
        startMonth: estimatedStartTime,
        endMonth: apiEndTime,
        view: 'sub-org',
      });

      try {
        DatadogCostByOrgResponseSchema.parse(estimatedCost);
        this.logger.debug(`Datadog estimated cost response validation passed`);
      } catch (error) {
        if (error instanceof ZodError) {
          this.logger.warn(`Datadog estimated cost response validation failed: ${error.message}`);
          this.logger.debug(`Sample validation errors: ${JSON.stringify(error.errors.slice(0, 3))}`);
        } else {
          this.logger.warn(`Unexpected validation error: ${error.message}`);
        }
      }

      if (estimatedCost.data) {
        costData.push(...estimatedCost.data);
      }
    }

    const costs: any[] = [];

    if (query.granularity === GRANULARITY.MONTHLY) {
      costData.forEach(costByOrg => {
        const orgName = costByOrg.attributes?.orgName as string;
        const date = costByOrg.attributes?.date;

        if (!this.evaluateIntegrationFilters(orgName, integrationConfig) || !date) {
          return;
        }

        costs.push({
          orgName: orgName,
          date: date,
          // only keep cost breakdown
          charges: costByOrg.attributes?.charges?.filter(charge => charge.chargeType !== 'total'),
        });
      });
    } else {
      // Datadog doesn't provide daily costs based on usage, so we allocate monthly costs evenly by day
      costData.forEach(costByOrg => {
        const orgName = costByOrg.attributes?.orgName as string;
        const date = costByOrg.attributes?.date;

        if (!this.evaluateIntegrationFilters(orgName, integrationConfig) || !date) {
          return;
        }

        const utcDate = moment.utc(date);
        const daysInMonth = utcDate.daysInMonth();

        costByOrg.attributes?.charges?.forEach(charge => {
          if (charge.chargeType === 'total') {
            // only keep cost breakdown
            return;
          }

          for (let i = 0; i < daysInMonth; i++) {
            const dailyCost = {
              orgName: orgName,
              date: utcDate.clone().add(i, 'd'),
              charges: [
                {
                  productName: charge.productName,
                  cost: (charge.cost || 0) / daysInMonth,
                  chargeType: charge.chargeType,
                },
              ],
            };
            costs.push(dailyCost);
          }
        });
      });
    }

    return costs;
  }

  async fetchForecastDetails(integrationConfig: Config): Promise<Map<string, number>> {
    const client = await this.initCloudClient(integrationConfig);
    const response: datadogApiV2.ProjectedCostResponse = await client.getProjectedCost({
      view: 'sub-org',
    });

    const forecastMap = new Map<string, number>();

    if (!response.data) {
      this.logger.debug('No forecast data returned from Datadog API');
      return forecastMap;
    }

    this.logger.debug(`Processing ${response.data.length} forecast items`);

    response.data.forEach(item => {
      const attributes = item.attributes;
      const orgName = attributes?.orgName;
      const charges = attributes?.charges;

      if (!orgName || !charges || !this.evaluateIntegrationFilters(orgName, integrationConfig)) {
        return;
      }

      charges.forEach((charge: datadogApiV2.ChargebackBreakdown) => {
        const productName = charge.productName;
        const chargeType = charge.chargeType;
        const cost = charge.cost;

        // Log all charge types to understand what's available
        if (productName) {
          this.logger.debug(`Forecast charge: ${productName}, type: ${chargeType}, cost: ${cost}`);
        }

        // Include all non-total charge types for forecast and aggregate by org->product
        // This way we sum all forecast charge types (committed, on_demand, etc.) for each product
        if (chargeType !== 'total' && productName && cost !== undefined && cost !== null && cost > 0) {
          const keyName = JSON.stringify({ orgName, productName });
          const currentAmount = forecastMap.get(keyName) || 0;
          forecastMap.set(keyName, currentAmount + cost);
          this.logger.debug(`Added forecast for ${keyName}: ${cost} (total: ${currentAmount + cost})`);
        }
      });
    });

    this.logger.info(`Collected ${forecastMap.size} forecast entries`);
    return forecastMap;
  }

  protected async transformCostsData(
    subAccountConfig: Config,
    query: CostQuery,
    costResponse: any,
    forecastData?: Map<string, number>,
  ): Promise<Report[]> {
    const tags = subAccountConfig.getOptionalStringArray('tags');
    const tagKeyValues: { [key: string]: string } = {};
    tags?.forEach(tag => {
      const [k, v] = tag.split(':');
      tagKeyValues[k.trim()] = v.trim();
    });

    // Get the forecast month in YYYY-MM format (current month, as Datadog API returns current month projection)
    const forecastMonth = moment.utc().format('YYYY-MM');

    // If forecastData is not provided but we're in a current month query, fetch it
    let forecastMap = forecastData;
    if (!forecastMap) {
      const currentMonth = moment.utc().startOf('month');
      const endTime = moment.utc(Number.parseInt(query.endTime, 10));
      if (endTime.isSameOrAfter(currentMonth)) {
        try {
          forecastMap = await this.fetchForecastDetails(subAccountConfig);
          this.logger.debug(`Fetched forecast details for ${forecastMap.size} products`);
        } catch (error) {
          this.logger.warn(`Failed to fetch forecast details: ${error.message}`);
        }
      }
    }

    // Initialize tracking variables
    let processedRecords = 0;
    let filteredOutZeroAmount = 0;
    let filteredOutMissingFields = 0;
    let filteredOutInvalidDate = 0;
    const filteredOutTimeRange = 0;
    const uniqueKeys = new Set<string>();
    const totalRecords = costResponse?.length || 0;

    const transformedDataMap = new Map<string, Report>();
    costResponse.forEach((costByOrg: any) => {
      const account = costByOrg.orgName;
      const charges = costByOrg.charges;
      if (!account || !costByOrg.date) {
        filteredOutMissingFields++;
        return;
      }
      let periodFormat = 'YYYY-MM';
      if (query.granularity === GRANULARITY.DAILY) {
        periodFormat = 'YYYY-MM-DD';
      }
      const dateObj = moment.utc(costByOrg.date);
      if (!dateObj.isValid()) {
        filteredOutInvalidDate++;
        return;
      }
      const period = dateObj.format(periodFormat);
      if (charges) {
        charges.forEach((charge: datadogApiV2.ChargebackBreakdown) => {
          const productName = charge.productName;
          const cost = charge.cost;
          if (!productName || cost === undefined || cost === null) {
            filteredOutMissingFields++;
            return;
          }
          const amount = parseCost(cost);
          if (amount === 0) {
            filteredOutZeroAmount++;
            return;
          }
          const key = makeReportKey(account ?? '', productName ?? '', charge.chargeType ?? '');
          if (!transformedDataMap.has(key)) {
            uniqueKeys.add(key);
            transformedDataMap.set(key, {
              id: key,
              account: `${this.provider}/${account}`,
              service: `${this.convertServiceName(productName as string)} (${charge.chargeType})`,
              category: 'Observability',
              provider: this.provider,
              providerType: PROVIDER_TYPE.INTEGRATION,
              reports: {},
              ...tagKeyValues,
            });
          }
          transformedDataMap.get(key)!.reports[period] = amount;
          processedRecords++;
        });
      }
    });
    const transformedData: { [key: string]: Report } = {};
    for (const [k, v] of transformedDataMap.entries()) {
      transformedData[k] = v;
    }

    if (forecastMap && forecastMap.size > 0) {
      this.logger.debug(`Integrating ${forecastMap.size} forecast entries into reports`);
      forecastMap.forEach((forecastAmount, forecastKey) => {
        let matchedReport: string | null = null;
        try {
          const { orgName: forecastOrg, productName: forecastProduct } = JSON.parse(forecastKey);
          for (const reportKey of Object.keys(transformedData)) {
            try {
              const { orgName, productName } = parseReportKey(reportKey);
              if (orgName === forecastOrg && productName === forecastProduct && !matchedReport) {
                matchedReport = reportKey;
                if (!transformedData[reportKey].forecast) {
                  transformedData[reportKey].forecast = {};
                }
                transformedData[reportKey].forecast[forecastMonth] = parseCost(forecastAmount);
                this.logger.debug(`Matched forecast ${forecastKey} (${forecastAmount}) to report ${reportKey}`);
              }
            } catch (reportParseError) {
              this.logger.warn(`Failed to parse report key: ${reportKey}, skipping`);
              continue;
            }
          }
          if (!matchedReport) {
            this.logger.warn(`No matching report found for forecast key: ${forecastKey}`);
          }
        } catch (forecastParseError) {
          this.logger.warn(`Failed to parse forecast key: ${forecastKey}, skipping`);
        }
      });
    }

    this.logTransformationSummary({
      processed: processedRecords,
      uniqueReports: uniqueKeys.size,
      zeroAmount: filteredOutZeroAmount,
      missingFields: filteredOutMissingFields,
      invalidDate: filteredOutInvalidDate,
      timeRange: filteredOutTimeRange,
      totalRecords,
    });

    // Log forecast integration summary
    const reportsWithForecast = Object.values(transformedData).filter(
      r => r.forecast && Object.keys(r.forecast).length > 0,
    );
    if (reportsWithForecast.length > 0) {
      this.logger.info(`Successfully integrated forecast data into ${reportsWithForecast.length} reports`);
      reportsWithForecast.forEach(report => {
        const forecastValue = report.forecast ? Object.values(report.forecast)[0] : 0;
        this.logger.debug(`Report with forecast: ${report.id} = ${forecastValue}`);
      });
      const totalForecast = reportsWithForecast.reduce((sum, r) => {
        const val = r.forecast ? Object.values(r.forecast)[0] : 0;
        return sum + (val || 0);
      }, 0);
      this.logger.info(`Total forecast across all reports: ${totalForecast}`);
    } else if (forecastMap && forecastMap.size > 0) {
      this.logger.warn(`Forecast data was fetched (${forecastMap.size} entries) but no reports were matched`);
    }

    return Object.values(transformedData);
  }
}
