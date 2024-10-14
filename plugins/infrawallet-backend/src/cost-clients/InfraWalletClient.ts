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
import {
  ClientResponse,
  CloudProviderError,
  CostQuery,
  Filter,
  Report,
  Tag,
  TagsQuery,
  TagsResponse,
} from '../service/types';

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

  protected evaluateIntegrationFilters(account: string, integrationConfig: Config): boolean {
    const filters: Filter[] = [];
    for (const filter of integrationConfig.getOptionalConfigArray('filters') || []) {
      filters.push({
        type: filter.getString('type'),
        attribute: filter.getString('attribute'),
        pattern: filter.getString('pattern'),
      });
    }
    return this.evaluateFilters(account, filters);
  }

  private evaluateFilters(account: string, filters: Filter[]): boolean {
    if (!filters || filters.length === 0) {
      // include if no filter
      return true;
    }

    let included = false;
    let hasIncludeFilter = false;

    for (const filter of filters) {
      const regex = new RegExp(filter.pattern);

      if (filter.type === 'exclude' && regex.test(account)) {
        // exclude immediately if an exclude filter matches
        return false;
      }

      if (filter.type === 'include') {
        hasIncludeFilter = true;

        if (regex.test(account)) {
          included = true;
        }
      }
    }

    if (hasIncludeFilter) {
      return included;
    }

    return true;
  }

  protected abstract initCloudClient(integrationConfig: Config): Promise<any>;

  // Get all cost allocation tag keys from one account
  protected async fetchTagKeys(
    _integrationConfig: Config,
    _client: any,
    _query: TagsQuery,
  ): Promise<{ tagKeys: string[]; provider: CLOUD_PROVIDER }> {
    // To be implemented by each provider client
    return { tagKeys: [], provider: this.provider };
  }

  // Get all tag values of the specified tag key from one account
  protected async fetchTagValues(
    _integrationConfig: Config,
    _client: any,
    _query: TagsQuery,
    _tagKey: string,
  ): Promise<{ tagValues: string[]; provider: CLOUD_PROVIDER }> {
    // To be implemented by each provider client
    return { tagValues: [], provider: this.provider };
  }

  protected abstract fetchCosts(integrationConfig: Config, client: any, query: CostQuery): Promise<any>;

  protected abstract transformCostsData(
    integrationConfig: Config,
    query: CostQuery,
    costResponse: any,
  ): Promise<Report[]>;

  // Get aggregated unique tag keys across all accounts of this cloud provider
  async getTagKeys(query: TagsQuery): Promise<TagsResponse> {
    const integrationConfigs = this.config.getOptionalConfigArray(
      `backend.infraWallet.integrations.${this.provider.toLowerCase()}`,
    );
    if (!integrationConfigs) {
      return { tags: [], errors: [] };
    }

    const promises = [];
    const aggregatedTags: Tag[] = [];
    const errors: CloudProviderError[] = [];

    for (const integrationConfig of integrationConfigs) {
      const integrationName = integrationConfig.getString('name');

      const cachedTagKeys = await getTagKeysFromCache(this.cache, this.provider, integrationName, query);
      if (cachedTagKeys) {
        this.logger.info(`Reuse ${this.provider}/${integrationName} tag keys from cache`);

        for (const tag of cachedTagKeys) {
          if (!tagExists(aggregatedTags, tag)) {
            aggregatedTags.push(tag);
          }
        }

        continue;
      }

      const promise = (async () => {
        try {
          const client = await this.initCloudClient(integrationConfig);
          const response = await this.fetchTagKeys(integrationConfig, client, query);
          const tagKeysCache: Tag[] = [];

          for (const tagKey of response.tagKeys) {
            const tag = { key: tagKey, provider: response.provider };
            tagKeysCache.push(tag);

            if (!tagExists(aggregatedTags, tag)) {
              aggregatedTags.push(tag);
            }
          }
          await setTagKeysToCache(this.cache, tagKeysCache, this.provider, integrationName, query);
        } catch (e) {
          this.logger.error(e);
          errors.push({
            provider: this.provider,
            name: `${this.provider}/${integrationName}`,
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
    const integrationConfigs = this.config.getOptionalConfigArray(
      `backend.infraWallet.integrations.${this.provider.toLowerCase()}`,
    );
    if (!integrationConfigs) {
      return { tags: [], errors: [] };
    }

    const promises = [];
    const aggregatedTags: Tag[] = [];
    const errors: CloudProviderError[] = [];

    for (const integrationConfig of integrationConfigs) {
      const integrationName = integrationConfig.getString('name');

      const cachedTagValues = await getTagValuesFromCache(this.cache, this.provider, integrationName, tagKey, query);
      if (cachedTagValues) {
        this.logger.info(`Reuse ${this.provider}/${integrationName}/${tagKey} tag values from cache`);

        for (const tag of cachedTagValues) {
          if (!tagExists(aggregatedTags, tag)) {
            aggregatedTags.push(tag);
          }
        }

        continue;
      }

      const promise = (async () => {
        try {
          const client = await this.initCloudClient(integrationConfig);
          const response = await this.fetchTagValues(integrationConfig, client, query, tagKey);
          const tagValuesCache: Tag[] = [];

          for (const tagValue of response.tagValues) {
            const tag = { key: tagKey, value: tagValue, provider: response.provider };
            tagValuesCache.push(tag);

            if (!tagExists(aggregatedTags, tag)) {
              aggregatedTags.push(tag);
            }
          }
          await setTagValuesToCache(this.cache, tagValuesCache, this.provider, integrationName, tagKey, query);
        } catch (e) {
          this.logger.error(e);
          errors.push({
            provider: this.provider,
            name: `${this.provider}/${integrationName}`,
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
    const integrationConfigs = this.config.getOptionalConfigArray(
      `backend.infraWallet.integrations.${this.provider.toLowerCase()}`,
    );
    if (!integrationConfigs) {
      return { reports: [], errors: [] };
    }

    const promises = [];
    const results: Report[] = [];
    const errors: CloudProviderError[] = [];

    for (const integrationConfig of integrationConfigs) {
      const integrationName = integrationConfig.getString('name');

      // first check if there is any cached
      const cachedCosts = await getReportsFromCache(this.cache, this.provider, integrationName, query);
      if (cachedCosts) {
        this.logger.debug(`${this.provider}/${integrationName} costs from cache`);
        cachedCosts.forEach(cost => {
          results.push(cost);
        });
        continue;
      }

      const promise = (async () => {
        try {
          const client = await this.initCloudClient(integrationConfig);
          const costResponse = await this.fetchCosts(integrationConfig, client, query);

          const transformedReports = await this.transformCostsData(integrationConfig, query, costResponse);

          // cache the results
          await setReportsToCache(
            this.cache,
            transformedReports,
            this.provider,
            integrationName,
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
            name: `${this.provider}/${integrationName}`,
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
