import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { reduce } from 'lodash';
import { ZodError } from 'zod';
import { BillingUsageResponseSchema, CostQuerySchema } from '../schemas/GitHubBilling';
import { CLOUD_PROVIDER, PROVIDER_TYPE } from '../service/consts';
import { getBillingPeriod, parseCost } from '../service/functions';
import { CostQuery, Report } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';

export class GitHubClient extends InfraWalletClient {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new GitHubClient(CLOUD_PROVIDER.GITHUB, config, database, cache, logger);
  }

  protected async initCloudClient(_integrationConfig: Config): Promise<any> {
    return null;
  }

  protected async fetchCosts(integrationConfig: Config, _client: any, query: CostQuery): Promise<any> {
    // Validate query parameters with Zod schema
    try {
      CostQuerySchema.parse(query);
    } catch (error) {
      if (error instanceof ZodError) {
        this.logger.error(`Invalid cost query parameters: ${error.message}`);
        throw new Error(`Invalid cost query parameters: ${error.message}`);
      }
      throw error;
    }

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

      // Validate response with Zod schema
      const validationResult = BillingUsageResponseSchema.safeParse(data);
      if (!validationResult.success) {
        this.logger.warn(
          `GitHub billing response validation failed for year ${year}: ${validationResult.error.message}`,
        );
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
    const transformedData = reduce(
      costResponse,
      (accumulator: { [key: string]: Report }, usageItem) => {
        const billingPeriod = getBillingPeriod(query.granularity, usageItem.date, 'YYYY-MM-DDTHH:mm:ssZ');
        const account = usageItem.organizationName;
        const sku = usageItem.sku;
        const cost = usageItem.netAmount;
        const keyName = `${this.provider}/${account}/${sku}`;

        if (!accumulator[keyName]) {
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

        accumulator[keyName].reports[billingPeriod] = parseCost(cost);

        return accumulator;
      },
      {},
    );

    return Object.values(transformedData);
  }
}
