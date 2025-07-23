import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { Logger } from 'winston';
import { infrawalletEntityReportExtensionPoint, InfrawalletReportCollector } from './extension';
import { createRouter } from './service/router';
import { CostFetchTaskScheduler } from './service/scheduler';

/**
 * infraWalletPlugin backend plugin
 *
 * @public
 */
export const infraWalletPlugin = createBackendPlugin({
  pluginId: 'infrawallet',
  register(env) {
    let entityReportCollector: InfrawalletReportCollector | undefined = undefined;

    env.registerExtensionPoint(infrawalletEntityReportExtensionPoint, {
      addReportCollector(collector: InfrawalletReportCollector) {
        if (entityReportCollector) {
          throw new Error('A report collector has already been registered.');
        }
        entityReportCollector = collector;
      },
    });

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
            entityReportCollector,
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
        });

        await taskScheduler.initialize();
      },
    });
  },
});
