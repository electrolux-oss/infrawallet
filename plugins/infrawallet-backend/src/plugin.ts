import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

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
        scheduler: coreServices.scheduler,
        cache: coreServices.cache,
        database: coreServices.database,
      },
      async init({ httpRouter, logger, config, scheduler, cache, database }) {
        httpRouter.use(
          await createRouter({
            logger,
            config,
            scheduler,
            cache,
            database,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
