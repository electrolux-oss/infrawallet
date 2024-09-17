import { LoggerService } from '@backstage/backend-plugin-api';

export class CategoryMappingService {
  private static instance: CategoryMappingService;

  static getInstance(): CategoryMappingService {
    if (!CategoryMappingService.instance) {
      CategoryMappingService.instance = new CategoryMappingService();
    }
    return CategoryMappingService.instance;
  }

  private categoryMappings: {
    [category: string]: {
      [provider: string]: string[];
    };
  } = {};

  private serviceToCategory: {
    [provider: string]: { [service: string]: string };
  } = {};

  private updateServiceToCategoryMappings() {
    for (const [category, mappings] of Object.entries(this.categoryMappings)) {
      for (const [provider, services] of Object.entries(mappings)) {
        const providerLowerCase = provider.toLowerCase();
        if (!(provider in this.serviceToCategory)) {
          this.serviceToCategory[providerLowerCase] = {};
        }
        services.forEach(service => {
          this.serviceToCategory[providerLowerCase][service] = category;
        });
      }
    }
  }

  public async fetchCategoryMappings(logger: LoggerService) {
    const datasource =
      'https://raw.githubusercontent.com/electrolux-oss/infrawallet-default-category-mappings/main/default_category_mappings.json';

    await fetch(datasource)
      .then(async response => {
        const data = await response.json();
        logger.debug('Default category mappings updated');
        this.categoryMappings = data;
        this.updateServiceToCategoryMappings();
      })
      .catch(_error => {
        // it might fail to retrive the mappings from our GitHub repo
        logger.error('Failed to fetch default category mappings from GitHub');
        logger.error('All services will be treated as "Uncategorized"');
      });
  }

  public getCategoryByServiceName(provider: string, serviceName: string): string {
    const providerLowerCase = provider.toLowerCase();
    if (this.serviceToCategory[providerLowerCase] && serviceName in this.serviceToCategory[providerLowerCase]) {
      return this.serviceToCategory[providerLowerCase][serviceName];
    }

    // do a regex match with service name and then update the serviceToCategory mappings
    for (const [category, mappings] of Object.entries(this.categoryMappings)) {
      if (providerLowerCase in mappings) {
        for (const service of mappings[providerLowerCase]) {
          const regex = new RegExp(service);
          if (regex.test(serviceName)) {
            this.serviceToCategory[providerLowerCase][serviceName] = category;
            return category;
          }
        }
      }
    }

    return 'Uncategorized';
  }
}
