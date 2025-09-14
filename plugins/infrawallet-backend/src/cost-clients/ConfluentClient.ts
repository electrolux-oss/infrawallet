import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { CostQuery, Report } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';
import moment from 'moment';
import { CategoryMappingService } from '../service/CategoryMappingService';
import {
  CLOUD_PROVIDER,
  PROVIDER_TYPE,
  NUMBER_OF_MONTHS_FETCHING_HISTORICAL_COSTS,
  GRANULARITY,
} from '../service/consts';
import { cryptoRandom } from '../service/crypto';
import { ConfluentEnvironmentSchema, ConfluentBillingResponseSchema } from '../schemas/ConfluentBilling';
import { ZodError } from 'zod';

export class ConfluentClient extends InfraWalletClient {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new ConfluentClient(CLOUD_PROVIDER.CONFLUENT, config, database, cache, logger);
  }

  protected convertServiceName(serviceName: string): string {
    let convertedName = serviceName;

    const prefixes = ['Confluent'];

    for (const prefix of prefixes) {
      if (serviceName.startsWith(prefix)) {
        convertedName = serviceName.slice(prefix.length).trim();
      }
    }

    return `${this.provider}/${convertedName}`;
  }

  private capitalizeWords(str: string): string {
    return str
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private async fetchEnvDisplayName(client: any, envId: string, retryCount = 0): Promise<string> {
    try {
      const url = `https://api.confluent.cloud/org/v2/environments/${envId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: client.headers,
      });

      if (response.status === 429 && retryCount < 3) {
        // Apply exponential backoff for rate limiting
        const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
        const backoffTime = Math.min(30, retryAfter * Math.pow(2, retryCount));
        this.logger.info(
          `Rate limited when fetching environment name for ${envId}, backing off for ${backoffTime} seconds...`,
        );
        await new Promise(resolve => setTimeout(resolve, backoffTime * 1000));
        return this.fetchEnvDisplayName(client, envId, retryCount + 1);
      }

      if (!response.ok) {
        this.logger.warn(`Failed to fetch environment name for ${envId}: ${response.statusText}`);
        return envId;
      }

      const jsonResponse = await response.json();

      try {
        ConfluentEnvironmentSchema.parse(jsonResponse);
        this.logger.debug(`Confluent environment response validation passed`);
      } catch (error) {
        if (error instanceof ZodError) {
          this.logger.warn(`Confluent environment response validation failed: ${error.message}`);
        } else {
          this.logger.warn(`Unexpected validation error: ${error.message}`);
        }
      }

      return jsonResponse.display_name;
    } catch (error) {
      this.logger.warn(`Error fetching environment name for ${envId}: ${error.message}`);
      return envId;
    }
  }

  protected async initCloudClient(subAccountConfig: Config): Promise<any> {
    const apiKey = subAccountConfig.getString('apiKey');
    const apiSecret = subAccountConfig.getString('apiSecret');
    const auth = `${apiKey}:${apiSecret}`;

    const client = {
      headers: {
        Authorization: `Basic ${Buffer.from(auth).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      name: subAccountConfig.getString('name'),
    };

    return client;
  }

  private async fetchCostWithRetry(url: string, client: any, retryCount = 0, maxRetries = 5): Promise<any> {
    try {
      this.logger.debug(`Fetching Confluent costs from URL: ${url}, attempt ${retryCount + 1}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: client.headers,
      });

      if (response.status === 403) {
        const errorText = await response.text();
        this.logger.error(`Failed to fetch Confluent costs: 403 Forbidden - ${errorText}`);
        throw new Error(`Authorization failed: ${errorText}`);
      }

      if (response.status === 429 && retryCount < maxRetries) {
        // Apply exponential backoff with jitter for rate limiting
        const retryAfter = parseInt(response.headers.get('retry-after') || '30', 10);
        const jitter = cryptoRandom() * 2;
        const backoffTime = Math.min(120, retryAfter * Math.pow(1.5, retryCount) * jitter);
        this.logger.warn(`Rate limited, backing off for ${Math.ceil(backoffTime)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime * 1000));
        return this.fetchCostWithRetry(url, client, retryCount + 1, maxRetries);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const jsonResponse = await response.json();

      try {
        ConfluentBillingResponseSchema.parse(jsonResponse);
        this.logger.debug(`Confluent billing response validation passed`);
      } catch (error) {
        if (error instanceof ZodError) {
          this.logger.warn(`Confluent billing response validation failed: ${error.message}`);
          this.logger.debug(`Sample validation errors: ${JSON.stringify(error.errors.slice(0, 3))}`);
        } else {
          this.logger.warn(`Unexpected validation error: ${error.message}`);
        }
      }

      return jsonResponse;
    } catch (error) {
      if (retryCount < maxRetries) {
        // Apply exponential backoff for general errors
        const backoffTime = Math.min(60, Math.pow(2, retryCount) * 3);
        this.logger.warn(`Error fetching costs, retrying in ${backoffTime} seconds: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, backoffTime * 1000));
        return this.fetchCostWithRetry(url, client, retryCount + 1, maxRetries);
      }
      throw error;
    }
  }

  protected async fetchCosts(_subAccountConfig: Config, client: any, query: CostQuery): Promise<any> {
    // Confluent API limits:
    // 1. Can only fetch 1 month at a time
    // 2. Can only go back exactly the number of months defined in NUMBER_OF_MONTHS_FETCHING_HISTORICAL_COSTS
    const LOOKBACK_MONTHS = NUMBER_OF_MONTHS_FETCHING_HISTORICAL_COSTS[CLOUD_PROVIDER.CONFLUENT];

    // Calculate the earliest date we can fetch
    const now = moment();
    const earliestAllowed = now.clone().subtract(LOOKBACK_MONTHS, 'months').startOf('month');

    // Convert query dates to moment objects
    const requestStartDate = moment(parseInt(query.startTime, 10));
    const requestEndDate = moment(parseInt(query.endTime, 10));

    // Adjust start date to be within the allowed range
    let startDate = requestStartDate.clone();
    if (startDate.isBefore(earliestAllowed)) {
      this.logger.info(
        `Confluent API only allows lookback of ${LOOKBACK_MONTHS} months. Adjusting start date from ${startDate.format('YYYY-MM-DD')} to ${earliestAllowed.format('YYYY-MM-DD')}`,
      );
      startDate = earliestAllowed.clone();
    }

    // Ensure we don't go past the requested end date
    const endDate = moment.min(requestEndDate, now);

    // Build monthly time ranges
    const monthlyRanges = [];
    const currentMonth = startDate.clone().startOf('month');

    while (currentMonth.isBefore(endDate) || currentMonth.isSame(endDate, 'month')) {
      const monthStart = currentMonth.clone().startOf('month');
      const monthEnd = moment.min(currentMonth.clone().endOf('month'), endDate);

      monthlyRanges.push({
        start: monthStart,
        end: monthEnd,
      });

      currentMonth.add(1, 'month');
    }

    this.logger.info(
      `Fetching Confluent costs for ${monthlyRanges.length} months from ${startDate.format('YYYY-MM')} to ${endDate.format('YYYY-MM')}`,
    );

    // Maximum number of concurrent requests to avoid overwhelming the API
    const maxConcurrentRequests = 2;
    const maxRetries = 4; // Maximum number of retries for a single month

    let aggregatedData: any[] = [];
    const envIdToName: Record<string, string> = {};

    // Process test request to check API access and potentially get first month's data
    try {
      // Use the most recent month for the test request as it's more likely to succeed
      const latestRange = monthlyRanges[monthlyRanges.length - 1];
      const testUrl = `https://api.confluent.cloud/billing/v1/costs?start_date=${latestRange.start.format(
        'YYYY-MM-DD',
      )}&end_date=${latestRange.end.clone().add(1, 'd').format('YYYY-MM-DD')}`;

      this.logger.debug(`Testing Confluent API access for ${latestRange.start.format('YYYY-MM')}`);

      const testResponse = await this.fetchCostWithRetry(testUrl, client, 0, 2);

      if (testResponse.data && testResponse.data.length > 0) {
        // Process environment names for this data
        const envIds = Array.from(
          new Set(
            testResponse.data.map((item: any) => item.resource?.environment?.id).filter((id: any) => id !== undefined),
          ),
        );

        if (envIds.length > 0) {
          // Fetch environment names
          for (const envId of envIds) {
            if (typeof envId === 'string') {
              try {
                const name = await this.fetchEnvDisplayName(client, envId);
                envIdToName[envId] = name;
              } catch (error) {
                this.logger.warn(`Error fetching name for environment ${envId}: ${error.message}`);
                envIdToName[envId] = envId; // Fallback to using the ID
              }
            }
          }

          const dataWithEnvNames = testResponse.data
            .filter((item: any) => item.resource?.environment?.id)
            .map((item: any) => {
              const envId = item.resource.environment.id;
              return {
                ...item,
                envDisplayName: envIdToName[envId] || 'Unknown',
              };
            });

          aggregatedData = aggregatedData.concat(dataWithEnvNames);
          this.logger.info(`Successfully fetched costs for ${latestRange.start.format('YYYY-MM')}`);
        }

        // Remove this month from the ranges to process since we already got it
        monthlyRanges.pop();
      }
    } catch (error) {
      this.logger.error(`Error testing Confluent API access: ${error.message}`);
    }

    // Process all remaining months in batches to respect rate limits
    // This uses a sliding window approach to process months in parallel but with a limit
    for (let i = 0; i < monthlyRanges.length; i += maxConcurrentRequests) {
      const batch = monthlyRanges.slice(i, i + maxConcurrentRequests);

      try {
        const batchResults = await Promise.all(
          batch.map(async range => {
            const url = `https://api.confluent.cloud/billing/v1/costs?start_date=${range.start.format(
              'YYYY-MM-DD',
            )}&end_date=${range.end.clone().add(1, 'd').format('YYYY-MM-DD')}`;

            try {
              const response = await this.fetchCostWithRetry(url, client, 0, maxRetries);

              this.logger.info(`Successfully fetched costs for ${range.start.format('YYYY-MM')}`);

              return {
                month: range.start.format('YYYY-MM'),
                data: response.data || [],
              };
            } catch (error) {
              this.logger.error(
                `Failed to fetch costs for ${range.start.format('YYYY-MM')} after multiple retries: ${error.message}`,
              );
              return {
                month: range.start.format('YYYY-MM'),
                data: [],
              };
            }
          }),
        );

        // Process batch results
        for (const result of batchResults) {
          if (result.data.length > 0) {
            // Extract environment IDs from this batch
            const envIds = Array.from(
              new Set(
                result.data
                  .map((item: any) => item.resource?.environment?.id)
                  .filter((id: any): id is string => typeof id === 'string'),
              ),
            );

            // Fetch any new environment names
            for (const envId of envIds) {
              if (typeof envId === 'string' && !(envId in envIdToName)) {
                // Add slight delay between env name requests
                await new Promise(resolve => setTimeout(resolve, 100));
                try {
                  const name = await this.fetchEnvDisplayName(client, envId);
                  envIdToName[envId] = name;
                } catch (error) {
                  this.logger.warn(`Error fetching name for environment ${envId}: ${error.message}`);
                  envIdToName[envId] = envId; // Fallback to using the ID
                }
              }
            }

            // Add environment names to the data
            const dataWithEnvNames = result.data
              .filter((item: any) => item.resource?.environment?.id)
              .map((item: any) => {
                const envId = item.resource.environment.id;
                return {
                  ...item,
                  envDisplayName: envIdToName[envId] || 'Unknown',
                };
              });

            aggregatedData = aggregatedData.concat(dataWithEnvNames);
          }
        }

        // Add a small delay between batches to help avoid rate limiting
        if (i + maxConcurrentRequests < monthlyRanges.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        this.logger.error(`Error processing batch of months: ${error.message}`);
      }
    }

    // Log a summary of what we got
    if (aggregatedData.length === 0) {
      this.logger.error(`No cost data could be fetched from Confluent API. Check API key permissions.`);
    } else {
      this.logger.info(`Successfully fetched ${aggregatedData.length} cost entries from Confluent API.`);
    }

    return {
      data: aggregatedData,
    };
  }

  protected async transformCostsData(subAccountConfig: Config, query: CostQuery, costResponse: any): Promise<Report[]> {
    const categoryMappingService = CategoryMappingService.getInstance();
    const accountName = subAccountConfig.getString('name');
    const tags = subAccountConfig.getOptionalStringArray('tags');
    const tagKeyValues: { [key: string]: string } = {};
    tags?.forEach(tag => {
      const [k, v] = tag.split(':');
      tagKeyValues[k.trim()] = v.trim();
    });

    // Handle empty or invalid data
    if (!costResponse || !costResponse.data || !Array.isArray(costResponse.data)) {
      this.logger.warn('No valid cost data to transform');
      return [];
    }

    this.logger.debug(`Starting transformation of ${costResponse.data.length} Confluent cost records`);

    // Log first few records structure for debugging
    if (costResponse.data.length > 0) {
      const sampleRecord = costResponse.data[0];
      this.logger.debug(`Sample Confluent record structure: ${JSON.stringify(Object.keys(sampleRecord))}`);
      this.logger.debug(
        `Sample record - start_date: ${sampleRecord.start_date}, line_type: ${sampleRecord.line_type}, price: ${sampleRecord.price}, amount: ${sampleRecord.amount}, original_amount: ${sampleRecord.original_amount}, discount_amount: ${sampleRecord.discount_amount}, product: ${sampleRecord.product}, network_access_type: ${sampleRecord.network_access_type}`,
      );
    }

    let filteredOutZeroAmount = 0;
    let filteredOutMissingFields = 0;
    let filteredOutInvalidDate = 0;
    let filteredOutTimeRange = 0;
    let processedRecords = 0;
    const uniqueKeys = new Set<string>();
    const uniqueServices = new Set<string>();
    const uniqueResources = new Set<string>();

    const transformedData = costResponse.data.reduce((accumulator: { [key: string]: Report }, line: any) => {
      // Use amount field first (final amount after discounts), then fall back to price field
      const amount = parseFloat(line.amount) || parseFloat(line.price) || 0;

      if (amount === 0) {
        filteredOutZeroAmount++;
        return accumulator;
      }

      // Skip records with missing critical fields
      if (!line.start_date || !line.line_type || (!line.amount && !line.price)) {
        filteredOutMissingFields++;
        return accumulator;
      }

      const parsedStartDate = moment(line.start_date);

      if (!parsedStartDate.isValid()) {
        filteredOutInvalidDate++;
        this.logger.debug(`Invalid start_date: ${line.start_date}`);
        return accumulator;
      }

      let billingPeriod = undefined;
      if (query.granularity === GRANULARITY.MONTHLY) {
        billingPeriod = parsedStartDate.format('YYYY-MM');
      } else {
        billingPeriod = parsedStartDate.format('YYYY-MM-DD');
      }

      // Create a more descriptive service name by combining product and line_type
      const baseServiceName = this.capitalizeWords(line.line_type);
      const productName = line.product ? this.capitalizeWords(line.product) : null;
      const serviceName =
        productName && productName !== baseServiceName ? `${productName} ${baseServiceName}` : baseServiceName;

      const resourceName = line.resource?.display_name || 'Unknown';
      const envDisplayName = line.envDisplayName || 'Unknown';
      const networkAccessType = line.network_access_type;

      uniqueServices.add(serviceName);
      uniqueResources.add(resourceName);

      const keyName = `${accountName}->${categoryMappingService.getCategoryByServiceName(
        this.provider,
        serviceName,
      )}->${resourceName}`;

      if (!accumulator[keyName]) {
        uniqueKeys.add(keyName);
        accumulator[keyName] = {
          id: keyName,
          account: `${this.provider}/${accountName}`,
          service: this.convertServiceName(serviceName),
          category: categoryMappingService.getCategoryByServiceName(this.provider, serviceName),
          provider: this.provider,
          providerType: PROVIDER_TYPE.INTEGRATION,
          reports: {},
          ...{ project: envDisplayName },
          ...{ cluster: resourceName },
          ...(networkAccessType && { networkAccessType }),
          ...tagKeyValues,
        };
      }

      if (!moment(billingPeriod).isBefore(moment(parseInt(query.startTime, 10)))) {
        accumulator[keyName].reports[billingPeriod] = (accumulator[keyName].reports[billingPeriod] || 0) + amount;
        processedRecords++;
      } else {
        filteredOutTimeRange++;
      }

      return accumulator;
    }, {});

    this.logTransformationSummary({
      processed: processedRecords,
      uniqueReports: uniqueKeys.size,
      zeroAmount: filteredOutZeroAmount,
      missingFields: filteredOutMissingFields,
      invalidDate: filteredOutInvalidDate,
      timeRange: filteredOutTimeRange,
      totalRecords: costResponse.data.length,
    });

    // Log a few unique keys to understand the grouping
    const keyArray = Array.from(uniqueKeys);
    if (keyArray.length > 0) {
      this.logger.info(`Unique services found: ${Array.from(uniqueServices).slice(0, 10).join(', ')}`);
      this.logger.info(`Unique resources found: ${Array.from(uniqueResources).slice(0, 10).join(', ')}`);
      this.logger.debug(`Sample unique keys: ${keyArray.slice(0, 5).join(', ')}`);
    }

    return Object.values(transformedData);
  }
}
