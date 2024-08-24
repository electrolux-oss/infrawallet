import { CacheService, DatabaseService } from '@backstage/backend-plugin-api';
import { CategoryMapping, CostQuery, Metric, MetricQuery, Report } from './types';

export async function getCategoryMappings(
  database: DatabaseService,
  provider: string,
): Promise<{ [service: string]: string }> {
  const result: { [service: string]: string } = {};
  const client = await database.getClient();
  const defaultMappings = await client
    .where({ provider: provider.toLowerCase() })
    .select()
    .from<CategoryMapping>('category_mappings_default');
  defaultMappings.forEach(mapping => {
    let services = mapping.cloud_service_names;
    if (typeof services === 'string') {
      // just in case if the database such as sqlite does not support JSON column
      services = JSON.parse(services);
    }

    services.forEach((service: string) => {
      result[service] = mapping.category;
    });
  });

  // check if there are any records defined by user
  const overrideMappings = await client
    .where({ provider: provider })
    .select()
    .from<CategoryMapping>('category_mappings_override');
  overrideMappings.forEach(mapping => {
    let services = mapping.cloud_service_names;
    if (typeof services === 'string') {
      // just in case if the database such as sqlite does not support JSON column
      services = JSON.parse(services);
    }

    services.forEach((service: string) => {
      result[service] = mapping.category;
    });
  });

  return result;
}

export function getCategoryByServiceName(serviceName: string, categoryMappings: { [service: string]: string }): string {
  if (serviceName in categoryMappings) {
    return categoryMappings[serviceName];
  }

  // do a regex match with service name
  for (const service in categoryMappings) {
    const regex = new RegExp(service);
    if (regex.test(serviceName)) {
      return categoryMappings[service];
    }
  }

  return 'Uncategorized';
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
    query.groups,
    query.granularity,
    query.startTime,
    query.endTime,
  ].join('_');
  const cachedCosts = (await cache.get(cacheKey)) as Report[] | undefined;
  return cachedCosts;
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
  const cachedMetrics = (await cache.get(cacheKey)) as Metric[] | undefined;
  return cachedMetrics;
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
    query.groups,
    query.granularity,
    query.startTime,
    query.endTime,
  ].join('_');
  await cache.set(cacheKey, reports, {
    ttl: ttl ?? 60 * 60 * 2 * 1000,
  }); // cache for 2 hours by default
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
