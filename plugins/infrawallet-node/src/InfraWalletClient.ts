import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { format } from 'date-fns';
import { CACHE_CATEGORY, CLOUD_PROVIDER, GRANULARITY } from './consts';
import {
  ClientResponse,
  CloudProviderError,
  CostQuery,
  Report,
  Tag,
  TagsQuery,
  TagsResponse,
  Filter,
  Wallet,
} from './types';

// Helper functions that would normally come from service/functions
// These are needed for the base functionality
export function getDefaultCacheTTL(category: CACHE_CATEGORY, provider: CLOUD_PROVIDER): number {
  // Default cache TTLs based on category and provider
  const DEFAULT_COSTS_CACHE_TTL: { [provider in CLOUD_PROVIDER]: number } = {
    [CLOUD_PROVIDER.AWS]: 2 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.AZURE]: 12 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.GCP]: 2 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.MONGODB_ATLAS]: 2 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.CONFLUENT]: 2 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.DATADOG]: 2 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.ELASTIC_CLOUD]: 2 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.GITHUB]: 2 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.CUSTOM]: 1,
    [CLOUD_PROVIDER.MOCK]: 0,
  };

  const DEFAULT_TAGS_CACHE_TTL: { [provider in CLOUD_PROVIDER]: number } = {
    [CLOUD_PROVIDER.AWS]: 1 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.AZURE]: 12 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.GCP]: 1 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.MONGODB_ATLAS]: 1 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.CONFLUENT]: 1 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.DATADOG]: 1 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.ELASTIC_CLOUD]: 1 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.GITHUB]: 1 * 60 * 60 * 1000,
    [CLOUD_PROVIDER.CUSTOM]: 1,
    [CLOUD_PROVIDER.MOCK]: 0,
  };

  if (category === CACHE_CATEGORY.COSTS) {
    return DEFAULT_COSTS_CACHE_TTL[provider];
  } else if (category === CACHE_CATEGORY.TAGS) {
    return DEFAULT_TAGS_CACHE_TTL[provider];
  }
  return 1 * 60 * 60 * 1000; // Default 1 hour
}

// Cache helper functions (simplified versions)
export async function getReportsFromCache(
  cache: CacheService,
  provider: CLOUD_PROVIDER,
  integrationName: string,
  query: CostQuery,
): Promise<Report[] | undefined> {
  const cacheKey = `costs:${provider}:${integrationName}:${JSON.stringify(query)}`;
  const cached = await cache.get(cacheKey);
  return cached && typeof cached === 'string' ? JSON.parse(cached) : undefined;
}

export async function setReportsToCache(
  cache: CacheService,
  reports: Report[],
  provider: CLOUD_PROVIDER,
  integrationName: string,
  query: CostQuery,
  ttl: number,
): Promise<void> {
  const cacheKey = `costs:${provider}:${integrationName}:${JSON.stringify(query)}`;
  await cache.set(cacheKey, JSON.stringify(reports), { ttl });
}

export async function getTagKeysFromCache(
  cache: CacheService,
  provider: CLOUD_PROVIDER,
  integrationName: string,
  query: TagsQuery,
): Promise<Tag[] | undefined> {
  const cacheKey = `tagKeys:${provider}:${integrationName}:${JSON.stringify(query)}`;
  const cached = await cache.get(cacheKey);
  return cached && typeof cached === 'string' ? JSON.parse(cached) : undefined;
}

export async function setTagKeysToCache(
  cache: CacheService,
  tags: Tag[],
  provider: CLOUD_PROVIDER,
  integrationName: string,
  query: TagsQuery,
): Promise<void> {
  const cacheKey = `tagKeys:${provider}:${integrationName}:${JSON.stringify(query)}`;
  const ttl = getDefaultCacheTTL(CACHE_CATEGORY.TAGS, provider);
  await cache.set(cacheKey, JSON.stringify(tags), { ttl });
}

export async function getTagValuesFromCache(
  cache: CacheService,
  provider: CLOUD_PROVIDER,
  integrationName: string,
  tagKey: string,
  query: TagsQuery,
): Promise<Tag[] | undefined> {
  const cacheKey = `tagValues:${provider}:${integrationName}:${tagKey}:${JSON.stringify(query)}`;
  const cached = await cache.get(cacheKey);
  return cached && typeof cached === 'string' ? JSON.parse(cached) : undefined;
}

export async function setTagValuesToCache(
  cache: CacheService,
  tags: Tag[],
  provider: CLOUD_PROVIDER,
  integrationName: string,
  tagKey: string,
  query: TagsQuery,
): Promise<void> {
  const cacheKey = `tagValues:${provider}:${integrationName}:${tagKey}:${JSON.stringify(query)}`;
  const ttl = getDefaultCacheTTL(CACHE_CATEGORY.TAGS, provider);
  await cache.set(cacheKey, JSON.stringify(tags), { ttl });
}

export function tagExists(tags: Tag[], tag: Tag): boolean {
  return tags.some(t => t.key === tag.key && t.value === tag.value && t.provider === tag.provider);
}

export function usageDateToPeriodString(usageDate: number): string {
  const date = new Date(usageDate);
  return format(date, 'yyyy-MM-dd');
}

export abstract class InfraWalletClient {
  constructor(
    protected readonly provider: CLOUD_PROVIDER,
    protected readonly config: Config,
    protected readonly database: DatabaseService,
    protected readonly cache: CacheService,
    protected readonly logger: LoggerService,
  ) {}

  protected convertServiceName(serviceName: string): string {
    return `${this.provider}/${serviceName}`;
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
        } catch (e: any) {
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
        } catch (e: any) {
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
    const autoloadCostData = this.config.getOptionalBoolean('backend.infraWallet.autoload.enabled') ?? false;
    const integrationConfigs = this.config.getOptionalConfigArray(
      `backend.infraWallet.integrations.${this.provider.toLowerCase()}`,
    );
    if (!integrationConfigs) {
      return { reports: [], errors: [] };
    }

    const results: Report[] = [];
    const errors: CloudProviderError[] = [];

    // if autoloadCostData enabled, for a query without any tags or groups, we get the results from the plugin database
    // skip Mock provider for autoloading data
    if (query.tags === '()' && query.groups === '' && autoloadCostData && this.provider !== CLOUD_PROVIDER.MOCK) {
      const reportsFromDatabase = await this.getCostReportsFromDatabase(query);
      reportsFromDatabase.forEach(report => {
        results.push(report);
      });
    } else {
      const promises = [];
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
          } catch (e: any) {
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
    }

    return {
      reports: results,
      errors: errors,
    };
  }

  async saveCostReportsToDatabase(wallet: Wallet, granularity: GRANULARITY): Promise<void> {
    // This method would need to be implemented with proper database access
    // For now, this is a placeholder that logs the operation
    this.logger.info(`Saving ${granularity} cost data for ${this.provider} to wallet ${wallet.name}`);

    // In a real implementation, this would:
    // 1. Check existing cost data in database
    // 2. Determine appropriate time range
    // 3. Fetch and save cost data using models
  }

  async getCostReportsFromDatabase(_query: CostQuery): Promise<Report[]> {
    // This method would need proper database models implementation
    // For now, return empty array as it requires backend-specific database access
    this.logger.debug(`Getting cost reports from database for ${this.provider}`);
    return [];
  }
}
