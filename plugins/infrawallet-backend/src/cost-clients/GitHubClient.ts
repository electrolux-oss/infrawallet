import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { reduce } from 'lodash';
import { CLOUD_PROVIDER, PROVIDER_TYPE } from '../service/consts';
import { getBillingPeriod, parseCost } from '../service/functions';
import { CostQuery, Report } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';
import { GitHubBillingResponseSchema } from '../schemas/GitHubBilling';
import { ZodError } from 'zod';

export class GitHubClient extends InfraWalletClient {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new GitHubClient(CLOUD_PROVIDER.GITHUB, config, database, cache, logger);
  }

  protected async initCloudClient(_integrationConfig: Config): Promise<any> {
    return null;
  }

  protected async fetchCosts(integrationConfig: Config, _client: any, query: CostQuery): Promise<any> {
    const token = integrationConfig.getString('token');
    const organization = integrationConfig.getString('organization');

    const startYear = new Date(Number(query.startTime)).getUTCFullYear();
    const endYear = new Date(Number(query.endTime)).getUTCFullYear();

    let allUsageItems: any[] = [];
    for (let year = startYear; year <= endYear; year++) {
      const url = `https://api.github.com/organizations/${organization}/settings/billing/usage?year=${year}`;
      this.logger.info(`Fetching GitHub costs from ${url}`);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (!response.ok) {
        this.logger.error(`Failed to fetch GitHub costs for year ${year}: ${response.statusText}`);
        continue;
      }

      const data = await response.json();

      try {
        GitHubBillingResponseSchema.parse(data);
        this.logger.debug(`GitHub billing response validation passed`);
      } catch (error) {
        if (error instanceof ZodError) {
          this.logger.warn(`GitHub billing response validation failed: ${error.message}`);
          this.logger.debug(`Sample validation errors: ${JSON.stringify(error.errors.slice(0, 3))}`);
        } else {
          this.logger.warn(`Unexpected validation error: ${error.message}`);
        }
      }

      if (Array.isArray(data.usageItems)) {
        allUsageItems = allUsageItems.concat(data.usageItems);
      }
    }

    return allUsageItems;
  }

  protected async transformCostsData(
    _integrationConfig: Config,
    query: CostQuery,
    costResponse: any,
  ): Promise<Report[]> {
    // Initialize tracking variables
    let processedRecords = 0;
    let filteredOutZeroAmount = 0;
    let filteredOutMissingFields = 0;
    const filteredOutInvalidDate = 0;
    const filteredOutTimeRange = 0;
    const uniqueKeys = new Set<string>();
    const totalRecords = costResponse?.length || 0;

    const transformedData = reduce(
      costResponse,
      (accumulator: { [key: string]: Report }, usageItem) => {
        // Check for missing fields
        if (
          !usageItem.date ||
          !usageItem.organizationName ||
          !usageItem.sku ||
          usageItem.netAmount === undefined ||
          usageItem.netAmount === null
        ) {
          filteredOutMissingFields++;
          return accumulator;
        }

        const amount = parseCost(usageItem.netAmount);

        // Check for zero amount
        if (amount === 0) {
          filteredOutZeroAmount++;
          return accumulator;
        }

        const billingPeriod = getBillingPeriod(query.granularity, usageItem.date, 'YYYY-MM-DDTHH:mm:ssZ');
        const account = usageItem.organizationName;
        const sku = usageItem.sku;
        const keyName = `${this.provider}/${account}/${sku}`;

        if (!accumulator[keyName]) {
          uniqueKeys.add(keyName);
          accumulator[keyName] = {
            id: keyName,
            account: `${this.provider}/${account}`,
            service: this.convertServiceName(sku),
            category: 'Developer Tools',
            provider: this.provider,
            providerType: PROVIDER_TYPE.INTEGRATION,
            reports: {},
          };
        }

        accumulator[keyName].reports[billingPeriod] = amount;
        processedRecords++;

        return accumulator;
      },
      {},
    );

    this.logTransformationSummary({
      processed: processedRecords,
      uniqueReports: uniqueKeys.size,
      zeroAmount: filteredOutZeroAmount,
      missingFields: filteredOutMissingFields,
      invalidDate: filteredOutInvalidDate,
      timeRange: filteredOutTimeRange,
      totalRecords,
    });

    return Object.values(transformedData);
  }
}
