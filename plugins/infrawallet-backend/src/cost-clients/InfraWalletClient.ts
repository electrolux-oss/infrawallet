import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { getCategoryMappings, getReportsFromCache, setReportsToCache } from '../service/functions';
import { ClientResponse, CloudProviderError, CostQuery, Report } from '../service/types';

export abstract class InfraWalletClient {
  constructor(
    protected readonly providerName: string,
    protected readonly config: Config,
    protected readonly database: DatabaseService,
    protected readonly cache: CacheService,
    protected readonly logger: LoggerService,
  ) {}

  convertServiceName(serviceName: string): string {
    return serviceName;
  }

  abstract initCloudClient(subAccountConfig: Config): Promise<any>;

  abstract fetchCostsFromCloud(subAccountConfig: Config, client: any, query: CostQuery): Promise<any>;

  abstract transformCostsData(
    subAccountConfig: Config,
    query: CostQuery,
    costResponse: any,
    categoryMappings: { [service: string]: string },
  ): Promise<Report[]>;

  async getCostReports(query: CostQuery): Promise<ClientResponse> {
    const conf = this.config.getOptionalConfigArray(
      `backend.infraWallet.integrations.${this.providerName.toLowerCase()}`,
    );
    if (!conf) {
      return { reports: [], errors: [] };
    }

    const promises = [];
    const results: Report[] = [];
    const errors: CloudProviderError[] = [];

    for (const c of conf) {
      const accountName = c.getString('name');

      // first check if there is any cached
      const cachedCosts = await getReportsFromCache(this.cache, this.providerName, accountName, query);
      if (cachedCosts) {
        this.logger.debug(`${this.providerName}/${accountName} costs from cache`);
        cachedCosts.map(cost => {
          results.push(cost);
        });
        continue;
      }

      const promise = (async () => {
        try {
          const client = await this.initCloudClient(c);
          const costResponse = await this.fetchCostsFromCloud(c, client, query);

          const categoryMappings = await getCategoryMappings(this.database, this.providerName);
          const transformedReports = await this.transformCostsData(c, query, costResponse, categoryMappings);

          // cache the results for 2 hours
          await setReportsToCache(
            this.cache,
            transformedReports,
            this.providerName,
            accountName,
            query,
            60 * 60 * 2 * 1000,
          );

          transformedReports.map((value: any) => {
            results.push(value);
          });
        } catch (e) {
          this.logger.error(e);
          errors.push({
            provider: this.providerName,
            name: `${this.providerName}/${accountName}`,
            error: e.message,
          });
        }
      })();
      promises.push(promise);
    }
    await Promise.all(promises);
    return {
      reports: results,
      errors: errors,
    };
  }
}
