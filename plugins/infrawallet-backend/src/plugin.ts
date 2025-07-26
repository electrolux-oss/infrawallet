import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { Logger } from 'winston';
import { createRouter } from './service/router';
import { CostFetchTaskScheduler } from './service/scheduler';
import { 
  infraWalletCostClientsExtensionPoint, 
  type CostClientRegistration 
} from '@electrolux-oss/plugin-infrawallet-node';

/**
 * infraWalletPlugin backend plugin
 *
 * @public
 */
export const infraWalletPlugin = createBackendPlugin({
  pluginId: 'infrawallet',
  register(env) {
    // Cost client registry
    const costClientRegistry = new Map<string, CostClientRegistration>();
    
    // Register extension point
    env.registerExtensionPoint(
      infraWalletCostClientsExtensionPoint,
      {
        registerCostClient(registration) {
          costClientRegistry.set(registration.provider.toLowerCase(), registration);
        },
      }
    );

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
        // 1. Register the HTTP endpoints
        httpRouter.use(
          await createRouter({
            logger,
            config,
            scheduler,
            cache,
            database,
            costClientRegistry,
          }),
        );

        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });

        // 2. Initialize the task scheduler
        const taskLogger = logger.child({ component: 'CostFetchTaskScheduler' }) as Logger;
        const taskScheduler = new CostFetchTaskScheduler({
          scheduler,
          logger: taskLogger,
          config,
          cache,
          database,
          costClientRegistry,
        });

        await taskScheduler.initialize();
      },
    });
  },
});
