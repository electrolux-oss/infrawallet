import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';
import { CategoryMappingService } from './service/CategoryMappingService';

/**
 * infraWalletPlugin backend plugin
 *
 * @public
 */
export const infraWalletPlugin = createBackendPlugin({
  pluginId: 'infrawallet',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        cache: coreServices.cache,
        database: coreServices.database,
        scheduler: coreServices.scheduler,
      },
      async init({ httpRouter, logger, config, cache, database, scheduler }) {
        httpRouter.use(
          await createRouter({
            logger,
            config,
            cache,
            database,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
        await scheduler.scheduleTask({
          frequency: { hours: 4 },
          timeout: { seconds: 30 },
          id: 'fetch-default-category-mappings',
          fn: async () => {
            const categoryMappingService = CategoryMappingService.getInstance();

            logger.debug('Fetching default category mappings');
            await categoryMappingService.fetchCategoryMappings(logger);
          },
        });
      },
    });
  },
});
