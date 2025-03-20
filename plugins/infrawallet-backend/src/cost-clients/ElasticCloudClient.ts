import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import moment from 'moment';
import {
  GetChartsRequestSchema,
  ChartsResponseSchema,
  InstancesResponseSchema,
  ItemsResponseSchema,
} from '../schemas/ElasticBilling';
import { ZodError } from 'zod';
import { CLOUD_PROVIDER, PROVIDER_TYPE } from '../service/consts';
import { CostQuery, Report } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';

/**
 * Client for fetching and processing cost data from Elastic Cloud
 */
export class ElasticCloudClient extends InfraWalletClient {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new ElasticCloudClient(CLOUD_PROVIDER.ELASTIC_CLOUD, config, database, cache, logger);
  }

  protected convertServiceName(serviceName: string): string {
    // Remove 'Elastic' prefix if present
    return serviceName.startsWith('Elastic')
      ? `${this.provider}/${serviceName.slice('Elastic'.length).trim()}`
      : `${this.provider}/${serviceName}`;
  }

  protected async initCloudClient(integrationConfig: Config): Promise<any> {
    const apiKey = integrationConfig.getString('apiKey');

    return {
      baseUrl: 'https://billing.elastic-cloud.com',
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };
  }

  private async fetchWithRetry(url: string, headers: any, maxRetries = 3): Promise<any> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, { method: 'GET', headers });

        if (response.status === 429 && attempt < maxRetries) {
          const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
          this.logger.warn(`Rate limited by Elastic Cloud API, retrying after ${retryAfter} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Elastic Cloud API error (${response.status}): ${errorText}`);
        }

        return await response.json();
      } catch (error) {
        if (attempt < maxRetries) {
          const backoffTime = Math.pow(2, attempt) * 1000;
          this.logger.warn(`Error fetching from Elastic Cloud, retrying in ${backoffTime}ms: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        } else {
          throw error;
        }
      }
    }
    throw new Error(`Failed to fetch from Elastic Cloud API after ${maxRetries} attempts`);
  }

  protected async fetchCosts(integrationConfig: Config, client: any, query: CostQuery): Promise<any> {
    const { baseUrl, headers } = client;
    const organizationId = integrationConfig.getString('organizationId');
    // Convert to ISO 8601 format that's compliant with Zod's datetime validation
    // Use the Z suffix instead of +00:00 which may not be recognized by the schema
    const startDate = moment(parseInt(query.startTime, 10)).toISOString();
    const endDate = moment(parseInt(query.endTime, 10)).toISOString();
    const bucketingStrategy = query.granularity.toLowerCase() === 'daily' ? 'daily' : 'monthly';

    this.logger.info(
      `Fetching Elastic Cloud cost data from ${startDate} to ${endDate} with ${bucketingStrategy} granularity`,
    );

    try {
      // Create param objects without schema validation first
      const params = {
        from: startDate,
        to: endDate,
        bucketing_strategy: bucketingStrategy,
      };

      // The Elastic Cloud API requires ISO format dates, but the zod schemas expect a specific format
      // Instead of modifying the schemas, we'll use the params directly, logging validation issues
      try {
        GetChartsRequestSchema.parse(params);
      } catch (error) {
        if (error instanceof ZodError) {
          this.logger.warn(
            `Request parameters didn't match schema for GetChartsRequest: ${JSON.stringify(error.errors)}`,
          );
        } else {
          this.logger.warn(`Unexpected validation error: ${error.message}`);
        }
        this.logger.debug(`Using params directly: ${JSON.stringify(params)}`);
      }

      const chartParams = params;
      const instanceParams = { ...params, include_names: true };
      const itemsParams = { from: params.from, to: params.to };

      // Build URL query parameters
      const createQueryString = (queryParams: Record<string, any>) => {
        return Object.entries(queryParams)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
          .join('&');
      };

      // Fetch all data in parallel for better performance
      const [instanceCostsResponse, itemCostsResponse, chartsResponse] = await Promise.all([
        // 1. Fetch instance costs
        this.fetchWithRetry(
          `${baseUrl}/api/v2/billing/organizations/${organizationId}/costs/instances?${createQueryString(instanceParams)}`,
          headers,
        ).then(data => {
          // Log response validation result but continue with the data
          const validationResult = InstancesResponseSchema.safeParse(data);
          if (!validationResult.success) {
            this.logger.warn(`Response validation failed for instance costs: ${validationResult.error.message}`);
          } else {
            this.logger.debug(`Response validation passed for instance costs`);
          }
          this.logger.debug(`Received instance costs data with ${data?.instances?.length || 0} instances`);
          return data;
        }),

        // 2. Fetch item costs breakdown
        this.fetchWithRetry(
          `${baseUrl}/api/v2/billing/organizations/${organizationId}/costs/items?${createQueryString(itemsParams)}`,
          headers,
        ).then(data => {
          // Log response validation result but continue with the data
          const validationResult = ItemsResponseSchema.safeParse(data);
          if (!validationResult.success) {
            this.logger.warn(`Response validation failed for item costs: ${validationResult.error.message}`);
          } else {
            this.logger.debug(`Response validation passed for item costs`);
          }
          this.logger.debug(`Received item costs data with ${data?.products?.length || 0} products`);
          return data;
        }),

        // 3. Fetch time-series data
        this.fetchWithRetry(
          `${baseUrl}/api/v2/billing/organizations/${organizationId}/charts?${createQueryString(chartParams)}`,
          headers,
        ).then(data => {
          // Log response validation result but continue with the data
          const validationResult = ChartsResponseSchema.safeParse(data);
          if (!validationResult.success) {
            this.logger.warn(`Response validation failed for charts data: ${validationResult.error.message}`);
          } else {
            this.logger.debug(`Response validation passed for charts data`);
          }
          this.logger.debug(`Received charts data with ${data?.data?.length || 0} data points`);
          return data;
        }),
      ]);

      return {
        instanceCosts: instanceCostsResponse,
        itemCosts: itemCostsResponse,
        charts: chartsResponse,
      };
    } catch (error) {
      this.logger.error(`Error fetching Elastic Cloud costs: ${error.message}`);
      throw error;
    }
  }

  protected async transformCostsData(
    integrationConfig: Config,
    query: CostQuery,
    costResponse: any,
  ): Promise<Report[]> {
    const accountName = integrationConfig.getString('name');

    // Process tags from configuration
    const tagKeyValues = (integrationConfig.getOptionalStringArray('tags') || []).reduce<Record<string, string>>(
      (acc, tag) => {
        const [key, value] = tag.split(':').map(part => part.trim());
        acc[key] = value;
        return acc;
      },
      {},
    );

    // Initialize report collections
    const reports = new Map();
    const periodFormat = query.granularity.toLowerCase() === 'daily' ? 'YYYY-MM-DD' : 'YYYY-MM';

    try {
      // Process instance-level costs
      if (costResponse?.instanceCosts?.instances?.length) {
        const validInstances = costResponse.instanceCosts.instances.filter(
          (instance: { id: any; name: any }) => instance?.id && instance?.name,
        );

        this.logger.debug(
          `Processing ${validInstances.length} valid instances out of ${costResponse.instanceCosts.instances.length}`,
        );

        for (const instance of validInstances) {
          // Skip filtered instances
          if (!this.evaluateIntegrationFilters(instance.name, integrationConfig)) {
            continue;
          }

          const keyName = `instance-${instance.id}`;
          reports.set(keyName, {
            id: keyName,
            account: `${this.provider}/${accountName}`,
            service: this.convertServiceName(instance.name),
            category: 'Database', // TODO: find a better way in the EC API to determine the category
            provider: this.provider,
            providerType: PROVIDER_TYPE.INTEGRATION,
            reports: {},
            instanceId: instance.id,
            instanceName: instance.name,
            ...tagKeyValues,
          });
        }
      }

      // Process time-series data from charts
      if (costResponse?.charts?.data?.length) {
        this.logger.info(`Processing ${costResponse.charts.data.length} time points from chart data`);

        for (const timePoint of costResponse.charts.data) {
          if (!timePoint?.timestamp) continue;

          // Convert timestamp to period format
          const period = this.formatTimestamp(timePoint.timestamp, periodFormat);
          if (!period) continue;

          // Process each value in the time point
          if (Array.isArray(timePoint.values)) {
            for (const value of timePoint.values) {
              if (!value?.id) continue;

              // Try to match with instance reports
              const instanceKey = `instance-${value.id}`;
              if (reports.has(instanceKey)) {
                reports.get(instanceKey).reports[period] = value.value || 0;
              }

              // Try to match with item reports
              for (const [key, report] of reports.entries()) {
                if (
                  key.startsWith('item-') &&
                  value.name &&
                  ((report.service && value.name.includes(report.service)) ||
                    (report.productType && value.name.includes(report.productType)))
                ) {
                  report.reports[period] = value.value || 0;
                }
              }
            }
          }
        }
      }

      // Distribute costs for reports that don't have time-series data
      this.distributeRemainingCosts(costResponse, reports, query);
    } catch (error) {
      this.logger.error(`Error transforming Elastic Cloud cost data: ${error.message}`);
      throw error;
    }

    // Convert Map to array and filter out reports with no data
    const filteredReports = [...reports.values()].filter(report => Object.keys(report.reports).length > 0);

    // Ensure consistent period formatting for all reports
    for (const report of filteredReports) {
      this.standardizePeriods(report, periodFormat);
    }

    this.logger.info(
      `Returning ${filteredReports.length} reports with ${
        Object.keys(filteredReports.reduce((acc, r) => ({ ...acc, ...r.reports }), {})).length
      } periods`,
    );

    return filteredReports;
  }

  private formatTimestamp(timestamp: string | number, periodFormat: string): string | null {
    try {
      if (typeof timestamp === 'number') {
        // Convert seconds to milliseconds if needed
        const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
        return moment(timestampMs).format(periodFormat);
      }
      return moment(timestamp).format(periodFormat);
    } catch (error) {
      this.logger.warn(`Invalid timestamp format: ${timestamp}`);
      return null;
    }
  }

  private standardizePeriods(report: Report, periodFormat: string): void {
    const formattedReports: Record<string, number> = {};

    for (const [period, cost] of Object.entries(report.reports)) {
      const momentDate = moment(period);
      if (!momentDate.isValid()) {
        this.logger.warn(`Invalid period format: ${period} in report ${report.id}`);
        continue;
      }

      const formattedPeriod = momentDate.format(periodFormat);
      formattedReports[formattedPeriod] = cost as number;
    }

    report.reports = formattedReports;
  }

  private distributeRemainingCosts(costResponse: any, reports: Map<string, Report>, query: CostQuery): void {
    const itemsData = costResponse?.itemCosts?.products;
    if (!Array.isArray(itemsData)) return;

    let distributedItems = 0;
    const periodFormat = query.granularity.toLowerCase() === 'daily' ? 'YYYY-MM-DD' : 'YYYY-MM';

    for (const product of itemsData) {
      if (!product?.type || !Array.isArray(product?.product_line_items)) continue;

      for (const lineItem of product.product_line_items) {
        if (!lineItem?.name) continue;

        const keyName = `item-${product.type}-${lineItem.name}`;
        const report = reports.get(keyName);

        if (report && Object.keys(report.reports).length === 0) {
          const totalCost = (lineItem.total_ecu || 0) / 100; // Convert ECU to dollars

          if (totalCost > 0) {
            // Create entries for months in the query range
            const startMonth = moment(parseInt(query.startTime, 10));
            const endMonth = moment(parseInt(query.endTime, 10));
            const monthCount = Math.max(1, endMonth.diff(startMonth, 'months'));

            // Distribute the cost evenly
            for (
              let currentMonth = startMonth.clone().startOf('month');
              currentMonth.isSameOrBefore(endMonth, 'month');
              currentMonth.add(1, 'month')
            ) {
              const period = currentMonth.format(periodFormat);
              report.reports[period] = totalCost / monthCount;
              distributedItems++;
            }
          }
        }
      }
    }

    this.logger.debug(`Distributed costs across ${distributedItems} periods for items without time series data`);
  }

  // Override getCostReportsFromDatabase to ensure proper handling of Elastic Cloud data
  async getCostReportsFromDatabase(query: CostQuery): Promise<Report[]> {
    const reports = await super.getCostReportsFromDatabase(query);
    this.logger.debug(`Retrieved ${reports.length} ElasticCloud reports from database`);

    if (reports.length === 0) {
      this.logger.warn(`No ElasticCloud reports found in database for query: ${JSON.stringify(query)}`);
    }

    return reports;
  }
}
