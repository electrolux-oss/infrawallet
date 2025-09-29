import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { reduce } from 'lodash';
import { getWallet } from '../controllers/MetricSettingController';
import { CostItem, bulkInsertCostItems, countCostItems, getCostItems } from '../models/CostItem';
import {
  CACHE_CATEGORY,
  CLOUD_PROVIDER,
  GRANULARITY,
  NUMBER_OF_MONTHS_FETCHING_HISTORICAL_COSTS,
  PROVIDER_TYPE,
} from '../service/consts';
import {
  getDefaultCacheTTL,
  getReportsFromCache,
  getTagKeysFromCache,
  getTagValuesFromCache,
  logTransformationSummary,
  setReportsToCache,
  setTagKeysToCache,
  setTagValuesToCache,
  tagExists,
  usageDateToPeriodString,
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
  TransformationSummary,
  Wallet,
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

  protected logTransformationSummary(summary: TransformationSummary): void {
    logTransformationSummary(this.logger, this.provider, summary);
  }

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
    }

    return {
      reports: results,
      errors: errors,
    };
  }

  async saveCostReportsToDatabase(wallet: Wallet, granularity: GRANULARITY): Promise<void> {
    const count = await countCostItems(this.database, wallet.id, this.provider, granularity);

    const endTime = endOfMonth(new Date());
    let startTime = startOfMonth(addMonths(new Date(), -1));
    if (count === 0) {
      // if there is no record, the first call is going to fetch the last 364 days' cost data
      // it cannot be 365 day or 1 year because Azure API will responds with the following error
      // Invalid query definition: The time period for pulling the data cannot exceed 1 year(s)
      startTime = startOfMonth(
        addMonths(new Date(), -1 * NUMBER_OF_MONTHS_FETCHING_HISTORICAL_COSTS[this.provider] + 1),
      );
    }

    this.logger.debug(`Fetching ${granularity} costs from ${startTime} to ${endTime} for ${this.provider}`);

    const results: Report[] = [];
    const usageDateFormat = granularity === GRANULARITY.DAILY ? 'yyyyMMdd' : 'yyyyMM';
    try {
      const clientResponse = await this.getCostReports({
        filters: '',
        tags: '',
        groups: '',
        granularity: granularity,
        startTime: startTime.getTime().toString(),
        endTime: endTime.getTime().toString(),
      });
      clientResponse.reports.forEach((cost: Report) => {
        results.push(cost);
      });
    } catch (e) {
      this.logger.error(e);
    }

    await bulkInsertCostItems(
      this.database,
      wallet.id,
      this.provider,
      granularity,
      parseInt(format(startTime, usageDateFormat), 10),
      parseInt(format(endTime, usageDateFormat), 10),
      results,
    );
  }

  async getCostReportsFromDatabase(query: CostQuery): Promise<Report[]> {
    // TODO: support searching for different wallets in the future, for now it is always the default wallet
    const defaultWallet = await getWallet(this.database, 'default');
    if (defaultWallet !== undefined) {
      // query the database
      const usageDateFormat = query.granularity === 'daily' ? 'yyyyMMdd' : 'yyyyMM';
      const startUsageDate = parseInt(format(parseInt(query.startTime, 10), usageDateFormat), 10);
      const endUsageDate = parseInt(format(parseInt(query.endTime, 10), usageDateFormat), 10);
      const costItems = await getCostItems(
        this.database,
        defaultWallet.id,
        this.provider,
        query.granularity,
        startUsageDate,
        endUsageDate,
      );

      // transform the cost items into cost reports
      const transformedData = reduce(
        costItems,
        (accumulator: { [key: string]: Report }, row: CostItem) => {
          const key = row.key;
          const otherColumns =
            typeof row.other_columns === 'string' ? JSON.parse(row.other_columns) : row.other_columns;

          if (!accumulator[key]) {
            accumulator[key] = {
              id: key,
              account: row.account,
              service: row.service,
              category: row.category,
              provider: row.provider,
              providerType: PROVIDER_TYPE.INTEGRATION,
              reports: {},
              ...otherColumns,
            };
          }
          accumulator[key].reports[usageDateToPeriodString(row.usage_date)] = parseFloat(row.cost as string);

          return accumulator;
        },
        {},
      );

      return Object.values(transformedData);
    }

    return [];
  }
}
