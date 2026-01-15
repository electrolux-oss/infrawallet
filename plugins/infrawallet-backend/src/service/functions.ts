import { CacheService, LoggerService } from '@backstage/backend-plugin-api';
import { CACHE_CATEGORY, CLOUD_PROVIDER, DEFAULT_COSTS_CACHE_TTL, DEFAULT_TAGS_CACHE_TTL, GRANULARITY } from './consts';
import { CostQuery, Metric, MetricQuery, Report, Tag, TagsQuery, TransformationSummary } from './types';
import moment from 'moment';

// In URL, tags are defined in this format:
// tags=(provider1:key1=value1 OR provider2:key2=value2)
export function parseTags(tags: string): Tag[] {
  if (!tags.startsWith('(') || !tags.endsWith(')')) {
    return [];
  }

  const tagString = tags.slice(1, -1);
  if (!tagString) {
    return [];
  }

  const keyValuePairs = tagString.split(' OR ');
  return keyValuePairs.map(pair => {
    const [providerAndKey, value] = pair.split('=');
    const firstColonIndex = providerAndKey.indexOf(':');
    const provider = providerAndKey.slice(0, firstColonIndex);
    const key = providerAndKey.slice(firstColonIndex + 1);
    return { key: key, value: value, provider: provider };
  });
}

// convert Tag array to (provider1:key1=value1 OR provider2:key2=value2) format
export function tagsToString(tags: Tag[]): string {
  if (!tags || tags.length === 0) {
    return '()';
  }

  const keyValuePairs = tags.map(tag => `${tag.provider}:${tag.key}=${tag.value}`);
  return `(${keyValuePairs.join(' OR ')})`;
}

// check if targetTag exists in tags
export function tagExists(tags: Tag[], targetTag: Tag): boolean {
  return tags.some(
    tag => tag.provider === targetTag.provider && tag.key === targetTag.key && tag.value === targetTag.value,
  );
}

export function getDefaultCacheTTL(cacheCategory: CACHE_CATEGORY, provider: CLOUD_PROVIDER): number {
  if (cacheCategory === CACHE_CATEGORY.TAGS) {
    return DEFAULT_TAGS_CACHE_TTL[provider];
  } else if (cacheCategory === CACHE_CATEGORY.COSTS) {
    return DEFAULT_COSTS_CACHE_TTL[provider];
  }

  return 0;
}

export async function getTagKeysFromCache(
  cache: CacheService,
  provider: CLOUD_PROVIDER,
  configKey: string,
  query: TagsQuery,
): Promise<Tag[] | undefined> {
  const cacheKey = [CACHE_CATEGORY.TAGS, 'tag-keys', provider, configKey, query.startTime, query.endTime].join('_');
  const data = (await cache.get(cacheKey)) as Tag[] | undefined;
  return data;
}

export async function getTagValuesFromCache(
  cache: CacheService,
  provider: CLOUD_PROVIDER,
  configKey: string,
  tagKey: string,
  query: TagsQuery,
): Promise<Tag[] | undefined> {
  const cacheKey = [
    CACHE_CATEGORY.TAGS,
    'tag-values',
    provider,
    configKey,
    tagKey,
    query.startTime,
    query.endTime,
  ].join('_');
  const data = (await cache.get(cacheKey)) as Tag[] | undefined;
  return data;
}

export async function getReportsFromCache(
  cache: CacheService,
  provider: string,
  configKey: string,
  query: CostQuery,
): Promise<Report[] | undefined> {
  const cacheKey = [
    provider,
    configKey,
    query.filters,
    query.tags,
    query.groups,
    query.granularity,
    query.startTime,
    query.endTime,
  ].join('_');
  const cachedCosts = (await cache.get(cacheKey)) as Report[] | undefined;
  return cachedCosts;
}

export async function getForecastFromCache(
  cache: CacheService,
  provider: string,
  configKey: string,
  query: CostQuery,
): Promise<number | undefined> {
  const cacheKey = [
    'forecast',
    provider,
    configKey,
    query.filters,
    query.tags,
    query.groups,
    query.granularity,
    query.startTime,
    query.endTime,
  ].join('_');
  const cachedForecast = (await cache.get(cacheKey)) as number | undefined;
  return cachedForecast;
}

export async function getMetricsFromCache(
  cache: CacheService,
  provider: string,
  configKey: string,
  query: MetricQuery,
): Promise<Metric[] | undefined> {
  const cacheKey = [
    provider,
    configKey,
    query.name,
    query.query,
    query.granularity,
    query.startTime,
    query.endTime,
  ].join('_');
  const crypto = require('crypto');
  const cachedMetrics = (await cache.get(crypto.createHash('md5').update(cacheKey).digest('hex'))) as
    | Metric[]
    | undefined;
  return cachedMetrics;
}

export async function setTagKeysToCache(
  cache: CacheService,
  tags: Tag[],
  provider: CLOUD_PROVIDER,
  configKey: string,
  query: TagsQuery,
  ttl?: number,
) {
  const cacheKey = [CACHE_CATEGORY.TAGS, 'tag-keys', provider, configKey, query.startTime, query.endTime].join('_');
  await cache.set(cacheKey, tags, {
    ttl: ttl ?? getDefaultCacheTTL(CACHE_CATEGORY.TAGS, provider),
  });
}

export async function setTagValuesToCache(
  cache: CacheService,
  tags: Tag[],
  provider: CLOUD_PROVIDER,
  configKey: string,
  tagKey: string,
  query: TagsQuery,
  ttl?: number,
) {
  const cacheKey = [
    CACHE_CATEGORY.TAGS,
    'tag-values',
    provider,
    configKey,
    tagKey,
    query.startTime,
    query.endTime,
  ].join('_');
  await cache.set(cacheKey, tags, {
    ttl: ttl ?? getDefaultCacheTTL(CACHE_CATEGORY.TAGS, provider),
  });
}

export async function setReportsToCache(
  cache: CacheService,
  reports: Report[],
  provider: string,
  configKey: string,
  query: CostQuery,
  ttl?: number,
) {
  const cacheKey = [
    provider,
    configKey,
    query.filters,
    query.tags,
    query.groups,
    query.granularity,
    query.startTime,
    query.endTime,
  ].join('_');
  await cache.set(cacheKey, reports, {
    ttl: ttl ?? 60 * 60 * 2 * 1000,
  }); // cache for 2 hours by default
}

export async function setForecastToCache(
  cache: CacheService,
  forecast: number,
  provider: string,
  configKey: string,
  query: CostQuery,
  ttl?: number,
) {
  const cacheKey = [
    'forecast',
    provider,
    configKey,
    query.filters,
    query.tags,
    query.groups,
    query.granularity,
    query.startTime,
    query.endTime,
  ].join('_');
  await cache.set(cacheKey, forecast, {
    ttl: ttl ?? 60 * 60 * 2 * 1000, // cache for 2 hours by default, same as reports
  });
}

export async function setMetricsToCache(
  cache: CacheService,
  metrics: Metric[],
  provider: string,
  configKey: string,
  query: MetricQuery,
  ttl?: number,
) {
  const cacheKey = [
    provider,
    configKey,
    query.name,
    query.query,
    query.granularity,
    query.startTime,
    query.endTime,
  ].join('_');
  const crypto = require('crypto');
  await cache.set(crypto.createHash('md5').update(cacheKey).digest('hex'), metrics, {
    ttl: ttl ?? 60 * 60 * 2 * 1000,
  }); // cache for 2 hours by default
}

export function parseFilters(filters: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  if (!filters.startsWith('(') || !filters.endsWith(')')) {
    return result;
  }

  const filterString = filters.slice(1, -1);
  if (!filterString) {
    return result;
  }

  const keyValuePairs = filterString.split(',').map(pair => pair.trim());

  keyValuePairs.forEach(pair => {
    const [key, value] = pair.split(':').map(s => s.trim());
    if (key && value) {
      if (value.startsWith('(') && value.endsWith(')')) {
        // multiple values
        const values = value
          .slice(1, -1)
          .split('|')
          .map(v => v.trim());
        result[key] = values;
      } else {
        // single value
        result[key] = [value];
      }
    }
  });

  return result;
}

/**
 * Returns the date format string for a billing period based on granularity.
 */
export function getBillingPeriodFormat(granularity: GRANULARITY): string {
  if (granularity === GRANULARITY.MONTHLY) {
    return 'YYYY-MM';
  } else if (granularity === GRANULARITY.DAILY) {
    return 'YYYY-MM-DD';
  }
  throw new Error('Invalid granularity');
}

/**
 * Converts a source date string to a billing period string based on granularity and source format.
 */
export function getBillingPeriod(granularity: GRANULARITY, sourceDate: string, sourceFormat: string): string {
  return moment(sourceDate, sourceFormat, true).format(getBillingPeriodFormat(granularity));
}

/**
 * Parses a cost value and rounds to 2 decimal places.
 * Returns 0 if the value is not a valid number.
 */
export function parseCost(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

export function getDailyPeriodStringsForOneMonth(yyyymm: number): string[] {
  const dateOjb = moment(yyyymm.toString(), 'YYYYMM');
  const startOfMonth = moment(dateOjb).startOf('month');
  const endOfMonth = moment(dateOjb).endOf('month');
  const periods: string[] = [];

  for (let date = startOfMonth; date.isBefore(endOfMonth) || date.isSame(endOfMonth); date.add(1, 'day')) {
    periods.push(date.format('YYYY-MM-DD'));
  }

  return periods;
}

export function usageDateToPeriodString(usageDate: number): string {
  // usageDate format: either yyyymm (monthly) or yyyymmdd (daily)
  // output format: yyyy-mm (monthly) or yyyy-mm-dd (daily)
  const usageDateStr = usageDate.toString();
  if (usageDateStr.length === 6) {
    // Monthly format
    return `${usageDateStr.slice(0, 4)}-${usageDateStr.slice(4, 6)}`;
  } else if (usageDateStr.length === 8) {
    // Daily format
    return `${usageDateStr.slice(0, 4)}-${usageDateStr.slice(4, 6)}-${usageDateStr.slice(6, 8)}`;
  }
  throw new Error('Invalid usageDate format');
}

/**
 * Logs a standardized transformation summary for cost client data processing.
 * This provides consistent logging across all cost providers.
 */
export function logTransformationSummary(
  logger: LoggerService,
  provider: string,
  summary: TransformationSummary,
): void {
  logger.info(
    `${provider} transformation summary: processed=${summary.processed}, uniqueReports=${summary.uniqueReports}, zeroAmount=${summary.zeroAmount}, missingFields=${summary.missingFields}, invalidDate=${summary.invalidDate}, timeRange=${summary.timeRange}, totalRecords=${summary.totalRecords}`,
  );
}
