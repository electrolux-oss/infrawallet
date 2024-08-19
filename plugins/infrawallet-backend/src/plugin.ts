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
        cache: coreServices.cache,
        database: coreServices.database,
        permissions: coreServices.permissions,
        discovery: coreServices.discovery,
        httpAuth: coreServices.httpAuth,
      },
      async init({ httpRouter, logger, config, cache, database, permissions, discovery, httpAuth }) {
        httpRouter.use(
          await createRouter({
            logger,
            config,
            cache,
            database,
            permissions,
            discovery,
            httpAuth,
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
