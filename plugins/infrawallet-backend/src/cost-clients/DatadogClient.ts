import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { v2 as datadogApiV2, client as datadogClient } from '@datadog/datadog-api-client';
import { reduce } from 'lodash';
import moment from 'moment';
import { CLOUD_PROVIDER, GRANULARITY, PROVIDER_TYPE } from '../service/consts';
import { CostQuery, Report } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';

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
      ['ci_pipeline', 'CI Visibility Committers'],
      ['ci_pipeline_indexed_spans', 'CI Visibility Spans'],
      ['cloud_cost_management', 'Cloud Cost Hosts'],
      ['cspm_container', 'Cloud Security Management Containers Pro'],
      ['cspm_host', 'Cloud Security Management Hosts Pro'],
      ['csm_host_pro', 'Cloud Security Management Hosts Pro'],
      ['cws_host', 'Cloud Workload Security Hosts'],
      ['infra_container', 'Containers'],
      ['infra_container_excl_agent', 'Containers'],
      ['timeseries', 'Custom Metrics'],
      ['error_tracking', 'Error Tracking'],
      ['incident_management', 'Incident Management'],
      ['logs_indexed_15day', 'Indexed Logs (15-day Retention)'],
      ['logs_indexed_180day', 'Indexed Logs (180-day Retention)'],
      ['logs_indexed_1day', 'Indexed Logs (1-day Retention)'],
      ['logs_indexed_30day', 'Indexed Logs (30-day Retention)'],
      ['logs_indexed_360day', 'Indexed Logs (360-day Retention)'],
      ['logs_indexed_3day', 'Indexed Logs (3-day Retention)'],
      ['logs_indexed_45day', 'Indexed Logs (45-day Retention)'],
      ['logs_indexed_60day', 'Indexed Logs (60-day Retention)'],
      ['logs_indexed_7day', 'Indexed Logs (7-day Retention)'],
      ['logs_indexed_90day', 'Indexed Logs (90-day Retention)'],
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
      ['serverless_apm', 'Serverless Traced Invocations'],
      ['serverless_infra', 'Serverless Workload Functions'],
      ['siem', 'SIEM - Analyzed Logs'],
      ['synthetics_api_tests', 'Synthetics API Test Runs'],
      ['synthetics_browser_checks', 'Synthetics Browser Test Runs'],
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
    const startTime = moment(parseInt(query.startTime, 10));
    const endTime = moment(parseInt(query.endTime, 10));
    const firstDayOfLastMonth = moment().subtract(1, 'M').startOf('M');

    // check if costs prior to 2 months ago are in query, if yes, use historical_cost API
    // https://docs.datadoghq.com/api/latest/usage-metering/#get-historical-cost-across-your-account
    if (startTime.isBefore(firstDayOfLastMonth)) {
      const historicalCost: datadogApiV2.CostByOrgResponse = await client.getHistoricalCostByOrg({
        startMonth: startTime,
        endMonth: firstDayOfLastMonth.subtract(1, 'd'),
        view: 'sub-org',
      });

      if (historicalCost.data) {
        costData.push(...historicalCost.data);
      }
    }

    // check if current/last month costs are in query, if yes, use estimated_cost API
    // https://docs.datadoghq.com/api/latest/usage-metering/#get-estimated-cost-across-your-account
    if (endTime.isSameOrAfter(firstDayOfLastMonth)) {
      let estimatedCostStartTime = startTime;
      if (startTime.isBefore(firstDayOfLastMonth)) {
        estimatedCostStartTime = firstDayOfLastMonth;
      }

      const estimatedCost: datadogApiV2.CostByOrgResponse = await client.getEstimatedCostByOrg({
        startMonth: estimatedCostStartTime,
        endMonth: endTime,
        view: 'sub-org',
      });

      if (estimatedCost.data) {
        costData.push(...estimatedCost.data);
      }
    }

    const costs: any[] = [];

    if (query.granularity === GRANULARITY.MONTHLY) {
      costData.forEach(costByOrg => {
        const orgName = costByOrg.attributes?.orgName as string;
        if (!this.evaluateIntegrationFilters(orgName, integrationConfig)) {
          return;
        }

        costs.push({
          orgName: orgName,
          date: costByOrg.attributes?.date,
          // only keep cost breakdown
          charges: costByOrg.attributes?.charges?.filter(charge => charge.chargeType !== 'total'),
        });
      });
    } else {
      // Datadog doesn't provide daily costs based on usage, so we allocate monthly costs evenly by day
      costData.forEach(costByOrg => {
        const orgName = costByOrg.attributes?.orgName as string;
        if (!this.evaluateIntegrationFilters(orgName, integrationConfig)) {
          return;
        }

        const daysInMonth = moment(costByOrg.attributes?.date).daysInMonth();
        costByOrg.attributes?.charges?.forEach(charge => {
          if (charge.chargeType === 'total') {
            // only keep cost breakdown
            return;
          }

          for (let i = 0; i < daysInMonth; i++) {
            const dailyCost = {
              orgName: orgName,
              date: moment(costByOrg.attributes?.date).add(i, 'd'),
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

  protected async transformCostsData(subAccountConfig: Config, query: CostQuery, costResponse: any): Promise<Report[]> {
    const tags = subAccountConfig.getOptionalStringArray('tags');
    const tagKeyValues: { [key: string]: string } = {};
    tags?.forEach(tag => {
      const [k, v] = tag.split(':');
      tagKeyValues[k.trim()] = v.trim();
    });

    const transformedData = reduce(
      costResponse,
      (accumulator: { [key: string]: Report }, costByOrg) => {
        const account = costByOrg.orgName;
        const charges = costByOrg.charges;

        let periodFormat = 'YYYY-MM';
        if (query.granularity === GRANULARITY.DAILY) {
          periodFormat = 'YYYY-MM-DD';
        }
        const period = moment(costByOrg.date).format(periodFormat);

        if (charges) {
          charges.forEach((charge: datadogApiV2.ChargebackBreakdown) => {
            const productName = charge.productName;
            const cost = charge.cost;
            const keyName = `${account}->${productName} (${charge.chargeType})`;

            if (!accumulator[keyName]) {
              accumulator[keyName] = {
                id: keyName,
                account: `${this.provider}/${account}`,
                service: `${this.convertServiceName(productName as string)} (${charge.chargeType})`,
                category: 'Observability',
                provider: this.provider,
                providerType: PROVIDER_TYPE.INTEGRATION,
                reports: {},
                ...tagKeyValues,
              };
            }

            accumulator[keyName].reports[period] = cost || 0;
          });
        }

        return accumulator;
      },
      {},
    );

    return Object.values(transformedData);
  }
}
