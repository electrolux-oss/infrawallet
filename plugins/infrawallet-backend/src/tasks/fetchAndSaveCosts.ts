import { getWallet } from '../controllers/MetricSettingController';
import { InfraWalletClient } from '../cost-clients/InfraWalletClient';
import { CategoryMappingService } from '../service/CategoryMappingService';
import { COST_CLIENT_MAPPINGS, GRANULARITY } from '../service/consts';
import { RouterOptions } from '../service/types';

export async function fetchAndSaveCosts(options: RouterOptions) {
  const { logger, config, cache, database } = options;

  const categoryMappingService = CategoryMappingService.getInstance();
  await categoryMappingService.refreshCategoryMappings();

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
        if (provider in COST_CLIENT_MAPPINGS && provider !== 'mock') {
          const client: InfraWalletClient = COST_CLIENT_MAPPINGS[provider].create(config, database, cache, logger);

          const saveCostReportsToDatabasePromise = (async () => {
            try {
              await client.saveCostReportsToDatabase(defaultWallet, granularity);
            } catch (e) {
              logger.error(`Error in ${provider} cost client:`, e);
            }
          })();
          promises.push(saveCostReportsToDatabasePromise);
        }
      }
      await Promise.all(promises);
    }
  }
}
