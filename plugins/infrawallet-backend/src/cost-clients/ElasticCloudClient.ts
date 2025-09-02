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
          const retryAfter = parseInt(response.headers.get('retry-after') ?? '5', 10);
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

      const createQueryString = (queryParams: Record<string, any>) => {
        return Object.entries(queryParams)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
          .join('&');
      };

      const [instanceCostsResponse, itemCostsResponse, chartsResponse] = await Promise.all([
        this.fetchWithRetry(
          `${baseUrl}/api/v2/billing/organizations/${organizationId}/costs/instances?${createQueryString(instanceParams)}`,
          headers,
        ).then(data => {
          const validationResult = InstancesResponseSchema.safeParse(data);
          if (!validationResult.success) {
            this.logger.warn(`Response validation failed for instance costs: ${validationResult.error.message}`);
          } else {
            this.logger.debug(`Response validation passed for instance costs`);
          }
          this.logger.debug(`Received instance costs data with ${data?.instances?.length ?? 0} instances`);
          return data;
        }),

        this.fetchWithRetry(
          `${baseUrl}/api/v2/billing/organizations/${organizationId}/costs/items?${createQueryString(itemsParams)}`,
          headers,
        ).then(data => {
          const validationResult = ItemsResponseSchema.safeParse(data);
          if (!validationResult.success) {
            this.logger.warn(`Response validation failed for item costs: ${validationResult.error.message}`);
          } else {
            this.logger.debug(`Response validation passed for item costs`);
          }
          this.logger.debug(`Received item costs data with ${data?.products?.length ?? 0} products`);
          return data;
        }),

        this.fetchWithRetry(
          `${baseUrl}/api/v2/billing/organizations/${organizationId}/charts?${createQueryString(chartParams)}`,
          headers,
        ).then(data => {
          const validationResult = ChartsResponseSchema.safeParse(data);
          if (!validationResult.success) {
            this.logger.warn(`Response validation failed for charts data: ${validationResult.error.message}`);
          } else {
            this.logger.debug(`Response validation passed for charts data`);
          }
          this.logger.debug(`Received charts data with ${data?.data?.length ?? 0} data points`);
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
    const tagKeyValues = this.extractConfigTags(integrationConfig);

    // Initialize tracking variables - calculate totalRecords from different parts of costResponse
    let totalRecords = 0;

    if (costResponse?.instanceCosts?.instances?.length) {
      totalRecords += costResponse.instanceCosts.instances.length;
    }
    if (costResponse?.itemCosts?.products?.length) {
      totalRecords += costResponse.itemCosts.products.length;
    }
    if (costResponse?.charts?.data?.length) {
      totalRecords += costResponse.charts.data.length;
    }

    try {
      const reports = new Map();
      const periodFormat = this.getPeriodFormat(query);
      const uniqueKeys = new Set<string>();

      // Track metrics during processing
      const metrics = {
        processed: 0,
        zeroAmount: 0,
        missingFields: 0,
        invalidDate: 0,
        timeRange: 0,
      };

      this.processInstanceCosts(costResponse, reports, accountName, integrationConfig, tagKeyValues);
      this.processChartData(costResponse, reports, periodFormat);
      this.distributeRemainingCosts(costResponse, reports, query);

      const filteredReports = this.prepareReportsForOutput(reports, periodFormat);

      // Estimate processed records based on successful reports
      metrics.processed = filteredReports.reduce((sum, report) => sum + Object.keys(report.reports).length, 0);

      // Count unique keys from final reports
      filteredReports.forEach(report => uniqueKeys.add(report.id));

      this.logTransformationSummary({
        processed: metrics.processed,
        uniqueReports: uniqueKeys.size,
        zeroAmount: metrics.zeroAmount,
        missingFields: metrics.missingFields,
        invalidDate: metrics.invalidDate,
        timeRange: metrics.timeRange,
        totalRecords,
      });

      return filteredReports;
    } catch (error) {
      this.logger.error(`Error transforming Elastic Cloud cost data: ${error.message}`);
      throw error;
    }
  }

  private extractConfigTags(integrationConfig: Config): Record<string, string> {
    const tags = integrationConfig.getOptionalStringArray('tags') ?? [];
    const tagKeyValues: Record<string, string> = {};

    tags.forEach(tag => {
      const [k, v] = tag.split(':').map(part => part.trim());
      tagKeyValues[k] = v;
    });

    return tagKeyValues;
  }

  // Determine period format based on granularity
  private getPeriodFormat(query: CostQuery): string {
    return query.granularity.toLowerCase() === 'daily' ? 'YYYY-MM-DD' : 'YYYY-MM';
  }

  private processInstanceCosts(
    costResponse: any,
    reports: Map<string, Report>,
    accountName: string,
    integrationConfig: Config,
    tagKeyValues: Record<string, string>,
  ): void {
    if (!costResponse?.instanceCosts?.instances?.length) {
      return;
    }

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

  private processChartData(costResponse: any, reports: Map<string, Report>, periodFormat: string): void {
    if (!costResponse?.charts?.data?.length) {
      return;
    }

    this.logger.info(`Processing ${costResponse.charts.data.length} time points from chart data`);

    for (const timePoint of costResponse.charts.data) {
      if (!timePoint?.timestamp) continue;

      const period = this.formatTimestamp(timePoint.timestamp, periodFormat);
      if (!period) continue;

      this.processTimePointValues(timePoint, period, reports);
    }
  }

  private processTimePointValues(timePoint: any, period: string, reports: Map<string, Report>): void {
    if (!Array.isArray(timePoint.values)) {
      return;
    }

    for (const value of timePoint.values) {
      // Skip if value is null/undefined or missing required fields
      if (!value?.id) continue;

      const instanceKey = `instance-${value.id}`;
      if (reports.has(instanceKey)) {
        const rawValue = value.value ?? 0;
        this.logger.debug(`Chart value for ${instanceKey} period ${period}: raw=${rawValue}`);
        reports.get(instanceKey)!.reports[period] = rawValue; // Using raw value for now
      }

      this.matchValueWithItemReports(value, period, reports);
    }
  }

  private matchValueWithItemReports(value: any, period: string, reports: Map<string, Report>): void {
    if (!value?.name) return;

    for (const [key, report] of reports.entries()) {
      if (
        key.startsWith('item-') &&
        ((report.service && value.name.includes(report.service)) ||
          (report.productType && value.name.includes(report.productType)))
      ) {
        const rawValue = value.value ?? 0;
        this.logger.debug(`Item value for ${key} period ${period}: raw=${rawValue}`);
        report.reports[period] = rawValue; // Using raw value for now
      }
    }
  }

  private distributeRemainingCosts(costResponse: any, reports: Map<string, Report>, query: CostQuery): void {
    const itemsData = costResponse?.itemCosts?.products;
    if (!Array.isArray(itemsData)) return;

    let distributedItems = 0;
    const periodFormat = this.getPeriodFormat(query);

    for (const product of itemsData) {
      if (!product?.type || !Array.isArray(product?.product_line_items)) continue;

      for (const lineItem of product.product_line_items) {
        if (!lineItem?.name) continue;

        const keyName = `item-${product.type}-${lineItem.name}`;
        const report = reports.get(keyName);

        if (report && Object.keys(report.reports).length === 0) {
          distributedItems += this.distributeItemCost(report, lineItem, query, periodFormat);
        }
      }
    }

    this.logger.debug(`Distributed costs across ${distributedItems} periods for items without time series data`);
  }

  private distributeItemCost(report: Report, lineItem: any, query: CostQuery, periodFormat: string): number {
    const rawTotalEcu = lineItem.total_ecu ?? 0;
    const totalCost = rawTotalEcu / 100; // Keep original conversion for line items
    this.logger.debug(`Distribute item cost for ${report.id}: raw_ecu=${rawTotalEcu}, converted_dollars=${totalCost}`);
    if (totalCost <= 0) return 0;

    const startMonth = moment(parseInt(query.startTime, 10));
    const endMonth = moment(parseInt(query.endTime, 10));
    const monthCount = Math.max(1, endMonth.diff(startMonth, 'months'));
    let periodsCreated = 0;

    for (
      let currentMonth = startMonth.clone().startOf('month');
      currentMonth.isSameOrBefore(endMonth, 'month');
      currentMonth.add(1, 'month')
    ) {
      const period = currentMonth.format(periodFormat);
      report.reports[period] = totalCost / monthCount;
      periodsCreated++;
    }

    return periodsCreated;
  }

  private prepareReportsForOutput(reports: Map<string, Report>, periodFormat: string): Report[] {
    const allReports = [...reports.values()];

    const filteredReports = allReports.filter(report => Object.keys(report.reports).length > 0);

    for (const report of filteredReports) {
      this.standardizePeriods(report, periodFormat);
    }

    return filteredReports;
  }

  private formatTimestamp(timestamp: string | number, periodFormat: string): string | null {
    try {
      if (typeof timestamp === 'number') {
        const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
        return moment(timestampMs).format(periodFormat);
      }
      return moment(timestamp).format(periodFormat);
    } catch (error) {
      this.logger.warn(
        `Error formatting timestamp ${timestamp}: ${error instanceof Error ? error.message : String(error)}`,
      );
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

  async getCostReportsFromDatabase(query: CostQuery): Promise<Report[]> {
    const reports = await super.getCostReportsFromDatabase(query);
    this.logger.debug(`Retrieved ${reports.length} ElasticCloud reports from database`);

    if (reports.length === 0) {
      this.logger.warn(`No ElasticCloud reports found in database for query: ${JSON.stringify(query)}`);
    }

    return reports;
  }
}
