import { DatabaseService, CacheService } from '@backstage/backend-plugin-api';
import { CategoryMapping } from './types';
import { CostQuery, Report } from './types';

export async function getCategoryMappings(
  database: DatabaseService,
  provider: string,
): Promise<{ [category: string]: string[] }> {
  const result: { [category: string]: string[] } = {};
  const client = await database.getClient();
  const mappings = await client.where({ provider: provider.toLowerCase() }).select().from<CategoryMapping>('category_mappings');
  mappings.forEach(mapping => {
    if (typeof mapping.cloud_service_names === 'string') {
      // just in case if the database such as sqlite does not support JSON column
      result[mapping.category] = JSON.parse(mapping.cloud_service_names);
    } else {
      result[mapping.category] = mapping.cloud_service_names;
    }
  });
  return result;
}

export function getCategoryByServiceName(
  serviceName: string,
  categoryMappings: { [category: string]: string[] },
): string {
  for (const key of Object.keys(categoryMappings)) {
    const serviceNames = categoryMappings[key];
    if (serviceNames && serviceNames.includes(serviceName)) {
      return key;
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
