import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { CACHE_CATEGORY, CLOUD_PROVIDER } from '../service/consts';
import {
  getDefaultCacheTTL,
  getReportsFromCache,
  getTagKeysFromCache,
  getTagValuesFromCache,
  setReportsToCache,
  setTagKeysToCache,
  setTagValuesToCache,
  tagExists,
} from '../service/functions';
import { ClientResponse, CloudProviderError, CostQuery, Report, Tag, TagsQuery, TagsResponse } from '../service/types';

export abstract class InfraWalletClient {
  constructor(
    protected readonly provider: CLOUD_PROVIDER,
    protected readonly config: Config,
    protected readonly database: DatabaseService,
    protected readonly cache: CacheService,
    protected readonly logger: LoggerService,
  ) {}

  protected convertServiceName(serviceName: string): string {
    return serviceName;
  }

  protected abstract initCloudClient(subAccountConfig: Config): Promise<any>;

  // Get all cost allocation tag keys from one account
  protected abstract fetchTagKeys(
    subAccountConfig: Config,
    client: any,
    query: TagsQuery,
  ): Promise<{ tagKeys: string[]; provider: CLOUD_PROVIDER }>;

  // Get all tag values of the specified tag key from one account
  protected abstract fetchTagValues(
    subAccountConfig: Config,
    client: any,
    query: TagsQuery,
    tagKey: string,
  ): Promise<{ tagValues: string[]; provider: CLOUD_PROVIDER }>;

  protected abstract fetchCosts(subAccountConfig: Config, client: any, query: CostQuery): Promise<any>;

  protected abstract transformCostsData(
    subAccountConfig: Config,
    query: CostQuery,
    costResponse: any,
  ): Promise<Report[]>;

  // Get aggregated unique tag keys across all accounts of this cloud provider
  async getTagKeys(query: TagsQuery): Promise<TagsResponse> {
    const accounts = this.config.getOptionalConfigArray(
      `backend.infraWallet.integrations.${this.provider.toLowerCase()}`,
    );
    if (!accounts) {
      return { tags: [], errors: [] };
    }

    const promises = [];
    const aggregatedTags: Tag[] = [];
    const errors: CloudProviderError[] = [];

    for (const account of accounts) {
      const accountName = account.getString('name');

      const cachedTagKeys = await getTagKeysFromCache(this.cache, this.provider, accountName, query);
      if (cachedTagKeys) {
        this.logger.info(`Reuse ${this.provider}/${accountName} tag keys from cache`);

        for (const tag of cachedTagKeys) {
          if (!tagExists(aggregatedTags, tag)) {
            aggregatedTags.push(tag);
          }
        }

        continue;
      }

      const promise = (async () => {
        try {
          const client = await this.initCloudClient(account);
          const response = await this.fetchTagKeys(account, client, query);
          const tagKeysCache: Tag[] = [];

          for (const tagKey of response.tagKeys) {
            const tag = { key: tagKey, provider: response.provider };
            tagKeysCache.push(tag);

            if (!tagExists(aggregatedTags, tag)) {
              aggregatedTags.push(tag);
            }
          }
          await setTagKeysToCache(this.cache, tagKeysCache, this.provider, accountName, query);
        } catch (e) {
          this.logger.error(e);
          errors.push({
            provider: this.provider,
            name: `${this.provider}/${accountName}`,
            error: e.message,
          });
        }
      })();
      promises.push(promise);
    }
    await Promise.all(promises);

    aggregatedTags.sort((a, b) => `${a.provider}/${a.key}`.localeCompare(`${b.provider}/${b.key}`));

    return {
      tags: aggregatedTags,
      errors: errors,
    };
  }

  // Get aggregated tag values of the specified tag key across all accounts of this cloud provider
  async getTagValues(query: TagsQuery, tagKey: string): Promise<TagsResponse> {
    const accounts = this.config.getOptionalConfigArray(
      `backend.infraWallet.integrations.${this.provider.toLowerCase()}`,
    );
    if (!accounts) {
      return { tags: [], errors: [] };
    }

    const promises = [];
    const aggregatedTags: Tag[] = [];
    const errors: CloudProviderError[] = [];

    for (const account of accounts) {
      const accountName = account.getString('name');

      const cachedTagValues = await getTagValuesFromCache(this.cache, this.provider, accountName, tagKey, query);
      if (cachedTagValues) {
        this.logger.info(`Reuse ${this.provider}/${accountName}/${tagKey} tag values from cache`);

        for (const tag of cachedTagValues) {
          if (!tagExists(aggregatedTags, tag)) {
            aggregatedTags.push(tag);
          }
        }

        continue;
      }

      const promise = (async () => {
        try {
          const client = await this.initCloudClient(account);
          const response = await this.fetchTagValues(account, client, query, tagKey);
          const tagValuesCache: Tag[] = [];

          for (const tagValue of response.tagValues) {
            const tag = { key: tagKey, value: tagValue, provider: response.provider };
            tagValuesCache.push(tag);

            if (!tagExists(aggregatedTags, tag)) {
              aggregatedTags.push(tag);
            }
          }
          await setTagValuesToCache(this.cache, tagValuesCache, this.provider, accountName, tagKey, query);
        } catch (e) {
          this.logger.error(e);
          errors.push({
            provider: this.provider,
            name: `${this.provider}/${accountName}`,
            error: e.message,
          });
        }
      })();
      promises.push(promise);
    }
    await Promise.all(promises);

    aggregatedTags.sort((a, b) =>
      `${a.provider}/${a.key}=${a.value}`.localeCompare(`${b.provider}/${b.key}=${b.value}`),
    );

    return {
      tags: aggregatedTags,
      errors: errors,
    };
  }

  async getCostReports(query: CostQuery): Promise<ClientResponse> {
    const accounts = this.config.getOptionalConfigArray(
      `backend.infraWallet.integrations.${this.provider.toLowerCase()}`,
    );
    if (!accounts) {
      return { reports: [], errors: [] };
    }

    const promises = [];
    const results: Report[] = [];
    const errors: CloudProviderError[] = [];

    for (const account of accounts) {
      const accountName = account.getString('name');

      // first check if there is any cached
      const cachedCosts = await getReportsFromCache(this.cache, this.provider, accountName, query);
      if (cachedCosts) {
        this.logger.debug(`${this.provider}/${accountName} costs from cache`);
        cachedCosts.forEach(cost => {
          results.push(cost);
        });
        continue;
      }

      const promise = (async () => {
        try {
          const client = await this.initCloudClient(account);
          const costResponse = await this.fetchCosts(account, client, query);

          const transformedReports = await this.transformCostsData(account, query, costResponse);

          // cache the results
          await setReportsToCache(
            this.cache,
            transformedReports,
            this.provider,
            accountName,
            query,
            getDefaultCacheTTL(CACHE_CATEGORY.COSTS, this.provider),
          );

          transformedReports.forEach((value: any) => {
            results.push(value);
          });
        } catch (e) {
          this.logger.error(e);
          errors.push({
            provider: this.provider,
            name: `${this.provider}/${accountName}`,
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
