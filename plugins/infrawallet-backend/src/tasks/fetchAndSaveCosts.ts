import { getWallet } from '../controllers/MetricSettingController';
import { InfraWalletClient } from '@electrolux-oss/plugin-infrawallet-node';
import { CategoryMappingService } from '../service/CategoryMappingService';
import { COST_CLIENT_MAPPINGS, GRANULARITY } from '../service/consts';
import { RouterOptions } from '../service/types';

export async function fetchAndSaveCosts(options: RouterOptions) {
  const { logger, config, cache, database, costClientRegistry } = options;

  const categoryMappingService = CategoryMappingService.getInstance();
  await categoryMappingService.refreshCategoryMappings();

  // Helper function to get cost client
  const getCostClient = (provider: string): InfraWalletClient | undefined => {
    const normalizedProvider = provider.toLowerCase();
    
    // Check external registry first
    if (costClientRegistry?.has(normalizedProvider)) {
      const registration = costClientRegistry.get(normalizedProvider)!;
      return registration.factory(config, database, cache, logger);
    }
    
    // Fall back to built-in clients for backward compatibility
    if (normalizedProvider in COST_CLIENT_MAPPINGS) {
      return COST_CLIENT_MAPPINGS[normalizedProvider].create(config, database, cache, logger);
    }
    
    return undefined;
  };

  // for now, this task only fetches costs for the default wallet
  const defaultWallet = await getWallet(database, 'default');
  const granularities = [GRANULARITY.DAILY, GRANULARITY.MONTHLY];

  if (defaultWallet !== undefined) {
    logger.debug('fetchAndSaveCosts method executed for the default wallet');
    for (const granularity of granularities) {
      const promises: Promise<void>[] = [];
      const conf = config.getConfig('backend.infraWallet.integrations');
      for (const provider of conf.keys()) {
        // skip mock provider as that client has some special logic to manipulate period strings
        if (provider !== 'mock') {
          const client = getCostClient(provider);
          if (client) {
            const saveCostReportsToDatabasePromise = (async () => {
              try {
                await client.saveCostReportsToDatabase(defaultWallet, granularity);
              } catch (e) {
                logger.error(e);
              }
            })();
            promises.push(saveCostReportsToDatabasePromise);
          }
        }
      }
      await Promise.all(promises);
    }
  }
}
