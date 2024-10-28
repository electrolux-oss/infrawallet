import { CacheService, LoggerService } from '@backstage/backend-plugin-api';
import { CACHE_CATEGORY, DEFAULT_CATEGORY_MAPPING_CACHE_TTL } from './consts';
import { CategoryMappings, ServiceToCategoryMappings } from './types';

export class CategoryMappingService {
  private static instance: CategoryMappingService;

  constructor(
    protected readonly cache: CacheService,
    protected readonly logger: LoggerService,
  ) {}

  static initInstance(cache: CacheService, logger: LoggerService) {
    if (!CategoryMappingService.instance) {
      CategoryMappingService.instance = new CategoryMappingService(cache, logger);
    }
  }

  static getInstance(): CategoryMappingService {
    if (!CategoryMappingService.instance) {
      throw new Error('CategoryMappingService needs to be initialized first');
    }
    return CategoryMappingService.instance;
  }

  private categoryMappings: CategoryMappings = {};
  private serviceToCategory: ServiceToCategoryMappings = {};

  private generateServiceToCategoryMappings(categoryMappings: CategoryMappings): ServiceToCategoryMappings {
    const result: ServiceToCategoryMappings = {};
    for (const [category, mappings] of Object.entries(categoryMappings)) {
      for (const [provider, services] of Object.entries(mappings)) {
        const providerLowerCase = provider.toLowerCase();
        if (!(provider in result)) {
          result[providerLowerCase] = {};
        }
        services.forEach(service => {
          result[providerLowerCase][service] = category;
        });
      }
    }
    return result;
  }

  private async fetchCategoryMappings(): Promise<CategoryMappings> {
    const datasource =
      'https://raw.githubusercontent.com/electrolux-oss/infrawallet-default-category-mappings/main/default_category_mappings.json';

    let result: CategoryMappings = {};

    await fetch(datasource)
      .then(async response => {
        const data = await response.json();
        this.logger.debug('Default category mappings updated');
        result = data;
      })
      .catch(_error => {
        // it might fail to retrive the mappings from our GitHub repo
        this.logger.error('Failed to fetch default category mappings from GitHub');
        this.logger.error('All services will be treated as "Uncategorized"');
      });

    return result;
  }

  public async refreshCategoryMappings() {
    let categoryMappings = (await this.cache.get(CACHE_CATEGORY.CATEGORY_MAPPINGS)) as CategoryMappings | undefined;
    if (categoryMappings === undefined) {
      // fetch the mappings from the GitHub repo and set it to the cache
      categoryMappings = await this.fetchCategoryMappings();
      await this.cache.set(CACHE_CATEGORY.CATEGORY_MAPPINGS, categoryMappings, {
        ttl: DEFAULT_CATEGORY_MAPPING_CACHE_TTL,
      });
      this.categoryMappings = categoryMappings;
      this.serviceToCategory = this.generateServiceToCategoryMappings(categoryMappings);
    } else {
      this.logger.debug('Reuse the category mappings from cache');
    }
  }

  public getCategoryByServiceName(provider: string, serviceName: string): string {
    const providerLowerCase = provider.toLowerCase();

    if (this.serviceToCategory[providerLowerCase] && serviceName in this.serviceToCategory[providerLowerCase]) {
      return this.serviceToCategory[providerLowerCase][serviceName];
    }

    // do a regex match with service name and then update the serviceToCategory mappings
    let result = 'Uncategorized';
    this.logger.debug(`${serviceName} does not belong to any category, do a regex search in the category mappings`);
    for (const [category, mappings] of Object.entries(this.categoryMappings)) {
      if (providerLowerCase in mappings) {
        for (const service of mappings[providerLowerCase]) {
          const regex = new RegExp(service);
          if (regex.test(serviceName)) {
            this.logger.debug(`${serviceName} belongs to ${category} in regex mode`);
            result = category;
          }
        }
      }
    }

    this.serviceToCategory[providerLowerCase][serviceName] = result;
    this.logger.debug(`serviceToCategoryMappings updated: ${providerLowerCase}/${serviceName} -> ${result}`);

    return result;
  }
}
