import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import moment from 'moment';
import { CategoryMappingService } from '../service/CategoryMappingService';
import { CLOUD_PROVIDER, PROVIDER_TYPE } from '../service/consts';
import { CostQuery, Report } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';

/**
 * Helper function to initialize ElasticCloud categories in the CategoryMappingService
 * This ensures the provider is properly registered in the mapping service
 */
function initializeElasticCloudCategories(categoryMappingService: CategoryMappingService): void {
  try {
    // Add ElasticCloud mapping to categoryMappings
    const providerLowerCase = CLOUD_PROVIDER.ELASTIC_CLOUD.toLowerCase();

    // Make sure the provider exists in serviceToCategory
    if (!categoryMappingService.serviceToCategory) {
      categoryMappingService.serviceToCategory = {};
    }

    if (!categoryMappingService.serviceToCategory[providerLowerCase]) {
      categoryMappingService.serviceToCategory[providerLowerCase] = {};
    }

    // Define default categories
    const defaultCategories = {
      Elasticsearch: ['elasticsearch', 'observability', 'monitoring', 'logging'],
      Kibana: ['kibana', 'dashboard'],
      APM: ['apm', 'tracing'],
      'Enterprise Search': ['enterprise', 'search', 'app search', 'workplace search'],
      Infrastructure: ['infrastructure', 'compute', 'storage'],
      Security: ['security', 'siem'],
    };

    // Add default categories to the categoryMappings
    if (!categoryMappingService.categoryMappings) {
      categoryMappingService.categoryMappings = {};
    }

    for (const [category, patterns] of Object.entries(defaultCategories)) {
      if (!categoryMappingService.categoryMappings[category]) {
        categoryMappingService.categoryMappings[category] = {};
      }

      categoryMappingService.categoryMappings[category][providerLowerCase] = patterns;
    }
  } catch (error) {
    // Silently fail - this is just a helper
    console.error('Failed to initialize ElasticCloud categories:', error);
  }
}

export class ElasticCloudClient extends InfraWalletClient {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    // Initialize Elastic Cloud categories in the CategoryMappingService
    try {
      const categoryMappingService = CategoryMappingService.getInstance();
      initializeElasticCloudCategories(categoryMappingService);
    } catch (error) {
      logger.warn(`Failed to initialize ElasticCloud categories: ${error.message}`);
    }

    return new ElasticCloudClient(CLOUD_PROVIDER.ELASTIC_CLOUD, config, database, cache, logger);
  }

  protected convertServiceName(serviceName: string): string {
    let convertedName = serviceName;

    const prefixes = ['Elastic'];

    for (const prefix of prefixes) {
      if (serviceName.startsWith(prefix)) {
        convertedName = serviceName.slice(prefix.length).trim();
      }
    }

    return `${this.provider}/${convertedName}`;
  }

  protected async initCloudClient(integrationConfig: Config): Promise<any> {
    const apiKey = integrationConfig.getString('apiKey');

    const client = {
      baseUrl: 'https://billing.elastic-cloud.com',
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    return client;
  }

  private async fetchWithRetry(url: string, client: any, maxRetries = 3, retryCount = 0): Promise<any> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: client.headers,
      });

      if (response.status === 429 && retryCount < maxRetries) {
        // Handle rate limiting
        const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
        this.logger.warn(`Rate limited by Elastic Cloud API, retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.fetchWithRetry(url, client, maxRetries, retryCount + 1);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Elastic Cloud API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (retryCount < maxRetries) {
        const backoffTime = Math.pow(2, retryCount) * 1000;
        this.logger.warn(`Error fetching from Elastic Cloud, retrying in ${backoffTime}ms: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return this.fetchWithRetry(url, client, maxRetries, retryCount + 1);
      }
      throw error;
    }
  }

  protected async fetchCosts(integrationConfig: Config, client: any, query: CostQuery): Promise<any> {
    const organizationId = integrationConfig.getString('organizationId');
    const baseUrl = client.baseUrl;

    // Explicitly convert timestamps to proper date format that Elastic Cloud API expects
    const startDate = moment(parseInt(query.startTime, 10)).format('YYYY-MM-DDTHH:mm:ss+00:00');
    const endDate = moment(parseInt(query.endTime, 10)).format('YYYY-MM-DDTHH:mm:ss+00:00');

    // Ensure we're using the right bucketing strategy
    const bucketingStrategy = query.granularity.toLowerCase() === 'daily' ? 'daily' : 'monthly';

    this.logger.info(
      `Fetching Elastic Cloud cost data from ${startDate} to ${endDate} with ${bucketingStrategy} granularity`,
    );

    // Initialize result containers with proper typing
    let instanceCostsData: any = { instances: [] };
    let itemCostsData: any = { products: [] };
    let chartsData: any = { data: [] };

    try {
      // 1. First, fetch instance costs to get an overview
      const instanceCostsUrl = `${baseUrl}/api/v2/billing/organizations/${organizationId}/costs/instances?from=${encodeURIComponent(startDate)}&to=${encodeURIComponent(endDate)}&include_names=true`;
      this.logger.info(`Fetching Elastic Cloud instance costs from ${startDate} to ${endDate}`);
      instanceCostsData = await this.fetchWithRetry(instanceCostsUrl, client);
      this.logger.debug(`Received instance costs data with ${instanceCostsData?.instances?.length || 0} instances`);

      // 2. Then, fetch item costs to get detailed breakdown by service type
      const itemCostsUrl = `${baseUrl}/api/v2/billing/organizations/${organizationId}/costs/items?from=${encodeURIComponent(startDate)}&to=${encodeURIComponent(endDate)}`;
      this.logger.info(`Fetching Elastic Cloud item costs from ${startDate} to ${endDate}`);
      itemCostsData = await this.fetchWithRetry(itemCostsUrl, client);
      this.logger.debug(`Received item costs data with ${itemCostsData?.products?.length || 0} products`);

      // 3. Also fetch charts to get time-series data - critical for historical data
      const chartsUrl = `${baseUrl}/api/v2/billing/organizations/${organizationId}/charts?from=${encodeURIComponent(startDate)}&to=${encodeURIComponent(endDate)}&bucketing_strategy=${bucketingStrategy}`;
      this.logger.info(
        `Fetching Elastic Cloud charts with ${bucketingStrategy} granularity from ${startDate} to ${endDate}`,
      );
      chartsData = await this.fetchWithRetry(chartsUrl, client);
      this.logger.debug(`Received charts data with ${chartsData?.data?.length || 0} data points`);
    } catch (error) {
      // Properly log the error details and rethrow to ensure proper handling
      this.logger.error(`Error fetching Elastic Cloud costs: ${error.message}`, error);
      throw error;
    }

    // Return the data we've collected
    return {
      instanceCosts: instanceCostsData,
      itemCosts: itemCostsData,
      charts: chartsData,
    };
  }

  protected async transformCostsData(
    integrationConfig: Config,
    query: CostQuery,
    costResponse: any,
  ): Promise<Report[]> {
    const accountName = integrationConfig.getString('name');
    const tags = integrationConfig.getOptionalStringArray('tags');
    const tagKeyValues: { [key: string]: string } = {};

    if (tags) {
      tags.forEach(tag => {
        const [k, v] = tag.split(':');
        tagKeyValues[k.trim()] = v.trim();
      });
    }

    // Initialize report collections
    const instanceReports: { [key: string]: Report } = {};
    const itemReports: { [key: string]: Report } = {};

    try {
      // First handle instance-level costs
      const instancesData = costResponse?.instanceCosts;

      if (instancesData?.instances && Array.isArray(instancesData.instances)) {
        this.logger.debug(`Processing ${instancesData.instances.length} instances from Elastic Cloud`);

        // Add validation for instance data
        const validInstances = instancesData.instances.filter((instance: { id: any; name: any }) => {
          if (!instance?.id || !instance?.name) {
            this.logger.warn(`Skipping instance with missing id or name: ${JSON.stringify(instance)}`);
            return false;
          }
          return true;
        });

        this.logger.debug(`Found ${validInstances.length} valid instances out of ${instancesData.instances.length}`);

        for (const instance of validInstances) {
          // Skip filtered instances
          if (!this.evaluateIntegrationFilters(instance.name, integrationConfig)) {
            continue;
          }

          const keyName = `instance-${instance.id}`;

          instanceReports[keyName] = {
            id: keyName,
            account: `${this.provider}/${accountName}`,
            service: this.convertServiceName(`Deployment: ${instance.name}`),
            category: 'Elastic Deployments',
            provider: this.provider,
            providerType: PROVIDER_TYPE.INTEGRATION,
            reports: {},
            instanceId: instance.id,
            instanceName: instance.name,
            ...tagKeyValues,
          };
        }
      }

      // Then handle item-level costs
      const itemsData = costResponse?.itemCosts;

      if (itemsData?.products && Array.isArray(itemsData.products)) {
        this.logger.debug(`Processing ${itemsData.products.length} products from Elastic Cloud`);

        // Add validation for products
        for (const product of itemsData.products) {
          if (!product?.type || !product?.product_line_items || !Array.isArray(product.product_line_items)) {
            this.logger.warn(`Skipping product with missing type or line items: ${JSON.stringify(product)}`);
            continue;
          }

          const productType = product.type;

          for (const lineItem of product.product_line_items) {
            if (!lineItem?.name) {
              this.logger.warn(`Skipping line item with missing name: ${JSON.stringify(lineItem)}`);
              continue;
            }

            const lineItemName = lineItem.name;
            const keyName = `item-${productType}-${lineItemName}`;
            const serviceName = `${productType}: ${lineItemName}`;

            // Determine category directly based on product type
            let category = 'Uncategorized';
            if (productType.toLowerCase().includes('elasticsearch')) {
              category = 'Elasticsearch';
            } else if (productType.toLowerCase().includes('kibana')) {
              category = 'Kibana';
            } else if (productType.toLowerCase().includes('apm')) {
              category = 'APM';
            } else if (productType.toLowerCase().includes('enterprise')) {
              category = 'Enterprise Search';
            }

            itemReports[keyName] = {
              id: keyName,
              account: `${this.provider}/${accountName}`,
              service: this.convertServiceName(serviceName),
              category: category,
              provider: this.provider,
              providerType: PROVIDER_TYPE.INTEGRATION,
              reports: {},
              productType: productType,
              ...tagKeyValues,
            };
          }
        }
      }

      // Now, process the time-series data from charts - THIS IS CRITICAL FOR HISTORICAL DATA
      const chartsData = costResponse?.charts;

      if (chartsData?.data && Array.isArray(chartsData.data)) {
        // Log the number of time points we have
        this.logger.info(`Processing ${chartsData.data.length} time points from chart data`);
        let processedDataPoints = 0;

        for (const timePoint of chartsData.data) {
          if (!timePoint?.timestamp) {
            this.logger.warn(`Skipping time point with missing timestamp: ${JSON.stringify(timePoint)}`);
            continue;
          }

          // FIXED: Properly handle timestamp conversion
          // Ensure timestamp is properly converted to the expected period format
          const periodFormat = query.granularity.toLowerCase() === 'daily' ? 'YYYY-MM-DD' : 'YYYY-MM';

          // Handle both number and string timestamps
          let period;
          if (typeof timePoint.timestamp === 'number') {
            // If timestamp is in seconds (common API format), convert to milliseconds
            const timestampMs = timePoint.timestamp * (timePoint.timestamp < 10000000000 ? 1000 : 1);
            period = moment(timestampMs).format(periodFormat);
          } else {
            // If it's already a string, try parsing it directly
            period = moment(timePoint.timestamp).format(periodFormat);
          }

          // Add debug logging to verify the timestamp conversion
          if (processedDataPoints === 0) {
            this.logger.debug(
              `Sample timestamp conversion: original=${timePoint.timestamp}, converted period=${period}`,
            );
          }

          // Check if period is valid and in expected range (additional validation)
          const periodDate = moment(period, periodFormat);
          if (!periodDate.isValid() || periodDate.isBefore('2000-01-01')) {
            this.logger.warn(`Invalid or very old period generated: ${period} from timestamp ${timePoint.timestamp}`);
            continue;
          }

          if (timePoint.values && Array.isArray(timePoint.values)) {
            for (const value of timePoint.values) {
              if (!value?.id) {
                continue;
              }

              // Try to match with an instance first
              const instanceKey = `instance-${value.id}`;
              if (instanceReports[instanceKey]) {
                instanceReports[instanceKey].reports[period] = value.value || 0;
                processedDataPoints++;
              }

              // Also try to match with item reports based on naming pattern
              for (const key of Object.keys(itemReports)) {
                const report = itemReports[key];

                // Check if this value matches the report based on name/id
                if (
                  value.name &&
                  ((report.service && value.name.includes(report.service)) ||
                    (report.productType && value.name.includes(report.productType)))
                ) {
                  itemReports[key].reports[period] = value.value || 0;
                  processedDataPoints++;
                }
              }
            }
          }
        }

        this.logger.debug(`Processed ${processedDataPoints} data points from Elastic Cloud charts`);
      } else {
        this.logger.warn('No chart data available, historical data may be incomplete');
      }

      // Fall back to itemized cost data for reports that didn't get time-series data
      if (itemsData?.products && Array.isArray(itemsData.products)) {
        let distributedItems = 0;

        for (const product of itemsData.products) {
          if (!product?.type || !product?.product_line_items || !Array.isArray(product.product_line_items)) {
            continue;
          }

          for (const lineItem of product.product_line_items) {
            if (!lineItem?.name) {
              continue;
            }

            const keyName = `item-${product.type}-${lineItem.name}`;

            if (itemReports[keyName] && Object.keys(itemReports[keyName].reports).length === 0) {
              // If no time periods were set from charts, use the total cost and distribute
              // to all periods in the query range
              const totalCost = (lineItem.total_ecu || 0) / 100; // Convert ECU to dollars

              if (totalCost > 0) {
                // Create entries for all months in the query range
                const startMonth = moment(parseInt(query.startTime, 10));
                const endMonth = moment(parseInt(query.endTime, 10));
                const currentMonth = startMonth.clone().startOf('month');

                // Create an entry for each month in the range
                while (currentMonth.isSameOrBefore(endMonth, 'month')) {
                  const periodFormat = query.granularity.toLowerCase() === 'daily' ? 'YYYY-MM-DD' : 'YYYY-MM';
                  const period = currentMonth.format(periodFormat);

                  // For monthly granularity, distribute cost evenly across months
                  // For daily, we'd need a more sophisticated approach
                  const monthCount = Math.max(1, endMonth.diff(startMonth, 'months'));
                  itemReports[keyName].reports[period] = totalCost / monthCount;

                  currentMonth.add(1, 'month');
                  distributedItems++;
                }
              }
            }
          }
        }

        this.logger.debug(`Distributed costs across ${distributedItems} periods for items without time series data`);
      }
    } catch (error) {
      this.logger.error(`Error transforming Elastic Cloud cost data: ${error.message}`);
      this.logger.error(error.stack);
      throw error;
    }

    // Combine instance and item reports
    const allReports = { ...instanceReports, ...itemReports };

    // Filter out reports with empty data
    const filteredReports = Object.values(allReports).filter(report => Object.keys(report.reports).length > 0);

    // Make sure each report has a unique ID
    filteredReports.forEach((report, index) => {
      // Ensure we have a unique ID by appending the index if needed
      if (!report.id || report.id.length === 0) {
        report.id = `elastic-cloud-report-${index}`;
      }
    });

    // Ensure consistent period formatting
    for (const report of filteredReports) {
      const formattedReports: Record<string, number> = {};
      for (const [period, cost] of Object.entries(report.reports)) {
        // Ensure period is in correct format (YYYY-MM-DD for daily, YYYY-MM for monthly)
        const momentDate = moment(period);
        if (!momentDate.isValid()) {
          this.logger.warn(`Invalid period format: ${period} in report ${report.id}`);
          continue;
        }

        const formattedPeriod =
          query.granularity.toLowerCase() === 'daily' ? momentDate.format('YYYY-MM-DD') : momentDate.format('YYYY-MM');

        formattedReports[formattedPeriod] = cost as number;
      }
      report.reports = formattedReports;
    }

    // Add debug logging to help diagnose issues
    if (filteredReports.length > 0) {
      const sampleReport = filteredReports[0];
      this.logger.debug(
        `Sample ElasticCloud report: ${sampleReport.id}, periods: ${Object.keys(sampleReport.reports).join(', ')}`,
      );
    }

    this.logger.info(
      `Returning ${filteredReports.length} reports with ${Object.keys(filteredReports.reduce((acc, r) => ({ ...acc, ...r.reports }), {})).length} periods`,
    );

    return filteredReports;
  }

  // Override getCostReportsFromDatabase to ensure proper handling of Elastic Cloud data
  async getCostReportsFromDatabase(query: CostQuery): Promise<Report[]> {
    // Call the parent method to get the base implementation
    const reports = await super.getCostReportsFromDatabase(query);

    // Log the number of reports retrieved from the database
    this.logger.debug(`Retrieved ${reports.length} ElasticCloud reports from database`);

    // If no reports were found in the database, log a warning
    if (reports.length === 0) {
      this.logger.warn(`No ElasticCloud reports found in database for query: ${JSON.stringify(query)}`);
    }

    return reports;
  }
}
