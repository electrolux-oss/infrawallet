import { resolvePackagePath } from '@backstage/backend-plugin-api';
import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
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
      },
      async init({ httpRouter, logger, config, cache, database }) {
        // check database migrations
        const client = await database.getClient();
        const migrationsDir = resolvePackagePath(
          '@electrolux-oss/plugin-infrawallet-backend',
          'migrations',
        );
        if (!database.migrations?.skip) {
          await client.migrate.latest({
            directory: migrationsDir,
          });
        }

        // if there are no category mappings, seed the database
        const category_mappings_count = await client('category_mappings').count(
          'id as c',
        );
        if (
          category_mappings_count[0].c === 0 ||
          category_mappings_count[0].c === '0'
        ) {
          const seedsDir = resolvePackagePath(
            '@electrolux-oss/plugin-infrawallet-backend',
            'seeds',
          );
          await client.seed.run({ directory: seedsDir });
        }

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
      },
    });
  },
});
