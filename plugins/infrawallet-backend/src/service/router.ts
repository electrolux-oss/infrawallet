import { createLegacyAuthAdapters, errorHandler } from '@backstage/backend-common';
import { NotAllowedError } from '@backstage/errors';
import {
  AuthService,
  CacheService,
  DatabaseService,
  DiscoveryService,
  HttpAuthService,
  LoggerService,
  PermissionsService,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import {
  deleteWalletMetricSetting,
  getWallet,
  getWalletMetricSettings,
  updateOrInsertWalletMetricSetting,
} from '../controllers/MetricSettingController';
import { InfraWalletClient } from './InfraWalletClient';
import { MetricProvider } from './MetricProvider';
import { COST_CLIENT_MAPPINGS, METRIC_PROVIDER_MAPPINGS } from './consts';
import { CloudProviderError, Metric, MetricSetting, Report } from './types';
import {
  AuthorizePermissionRequest,
  AuthorizeResult,
  QueryPermissionRequest,
} from '@backstage/plugin-permission-common';
import { permissions } from '@electrolux-oss/plugin-infrawallet-common';
import { createPermissionIntegrationRouter } from '@backstage/plugin-permission-node';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  cache: CacheService;
  database: DatabaseService;
  permissions: PermissionsService;
  discovery: DiscoveryService;
  auth?: AuthService;
  httpAuth?: HttpAuthService;
}

async function setUpDatabase(database: DatabaseService) {
  // check database migrations
  const client = await database.getClient();
  const migrationsDir = resolvePackagePath('@electrolux-oss/plugin-infrawallet-backend', 'migrations');
  if (!database.migrations?.skip) {
    await client.migrate.latest({
      directory: migrationsDir,
    });
  }

  // insert default category_mappings to the database
  const seedsDir = resolvePackagePath('@electrolux-oss/plugin-infrawallet-backend', 'seeds');
  await client.seed.run({ directory: seedsDir });
}

export async function createRouter(options: RouterOptions): Promise<express.Router> {
  const { logger, config, cache, database, permissions: permissionEvaluator } = options;
  const { httpAuth } = createLegacyAuthAdapters(options);

  const evaluateRequestPermission = async (
    request: express.Request,
    permission: AuthorizePermissionRequest | QueryPermissionRequest,
  ) => {
    const credentials = await httpAuth.credentials(request, {
      allow: ['user'],
    });

    const decision = permissions
      ? (await permissionEvaluator.authorize([permission as AuthorizePermissionRequest], { credentials }))[0]
      : undefined;

    if (decision && decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }

    return { decision, user: credentials.principal };
  };

  // do database migrations here to support the legacy backend system
  await setUpDatabase(database);

  const router = Router();
  router.use(express.json());
  router.use(
    createPermissionIntegrationRouter({
      permissions: Object.values(permissions),
    }),
  );

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/reports', async (request, response) => {
    await evaluateRequestPermission(request, {
      permission: permissions.infraWalletReportRead,
    });

    const filters = request.query.filters as string;
    const groups = request.query.groups as string;
    const granularity = request.query.granularity as string;
    const startTime = request.query.startTime as string;
    const endTime = request.query.endTime as string;
    const promises: Promise<void>[] = [];
    const results: Report[] = [];
    const errors: CloudProviderError[] = [];

    const conf = config.getConfig('backend.infraWallet.integrations');
    conf.keys().forEach((provider: string) => {
      if (provider in COST_CLIENT_MAPPINGS) {
        const client: InfraWalletClient = COST_CLIENT_MAPPINGS[provider].create(config, database, cache, logger);
        const fetchCloudCosts = (async () => {
          try {
            const clientResponse = await client.getCostReports({
              filters: filters,
              groups: groups,
              granularity: granularity,
              startTime: startTime,
              endTime: endTime,
            });
            clientResponse.errors.forEach((e: CloudProviderError) => {
              errors.push(e);
            });
            clientResponse.reports.forEach((cost: Report) => {
              results.push(cost);
            });
          } catch (e) {
            logger.error(e);
            errors.push({
              provider: client.constructor.name,
              name: client.constructor.name,
              error: e.message,
            });
          }
        })();
        promises.push(fetchCloudCosts);
      }
    });

    await Promise.all(promises);

    if (errors.length > 0) {
      response.status(207).json({ data: results, errors: errors, status: 207 });
    } else {
      response.json({ data: results, errors: errors, status: 200 });
    }
  });

  router.get('/:walletName/metrics', async (request, response) => {
    const walletName = request.params.walletName;
    const granularity = request.query.granularity as string;
    const startTime = request.query.startTime as string;
    const endTime = request.query.endTime as string;
    const promises: Promise<void>[] = [];
    const results: Metric[] = [];
    const errors: CloudProviderError[] = [];

    const conf = config.getConfig('backend.infraWallet.metricProviders');
    conf.keys().forEach((provider: string) => {
      if (provider in METRIC_PROVIDER_MAPPINGS) {
        const client: MetricProvider = METRIC_PROVIDER_MAPPINGS[provider].create(config, database, cache, logger);
        const fetchMetrics = (async () => {
          try {
            const metricResponse = await client.getMetrics({
              walletName: walletName,
              granularity: granularity,
              startTime: startTime,
              endTime: endTime,
            });
            metricResponse.errors.forEach((e: CloudProviderError) => {
              errors.push(e);
            });
            metricResponse.metrics.forEach((metric: Metric) => {
              results.push(metric);
            });
          } catch (e) {
            logger.error(e);
            errors.push({
              provider: client.constructor.name,
              name: client.constructor.name,
              error: e.message,
            });
          }
        })();
        promises.push(fetchMetrics);
      }
    });

    await Promise.all(promises);

    if (errors.length > 0) {
      response.status(207).json({ data: results, errors: errors, status: 207 });
    } else {
      response.json({ data: results, errors: errors, status: 200 });
    }
  });

  router.get('/:walletName', async (request, response) => {
    const walletName = request.params.walletName;
    const wallet = await getWallet(database, walletName);
    if (wallet === undefined) {
      response.status(404).json({ error: 'Wallet not found', status: 404 });
      return;
    }

    response.json({ data: wallet, status: 200 });
  });

  router.get('/:walletName/metrics_setting', async (request, response) => {
    await evaluateRequestPermission(request, {
      permission: permissions.infraWalletMetricSettingsRead,
    });

    const walletName = request.params.walletName;
    const metricSettings = await getWalletMetricSettings(database, walletName);
    response.json({ data: metricSettings, status: 200 });
  });

  router.get('/metric/metric_configs', async (request, response) => {
    await evaluateRequestPermission(request, {
      permission: permissions.infraWalletMetricSettingsRead,
    });

    const conf = config.getConfig('backend.infraWallet.metricProviders');
    const configNames: { metric_provider: string; config_name: string }[] = [];
    conf.keys().forEach((provider: string) => {
      const configs = conf.getOptionalConfigArray(provider);
      if (configs) {
        configs.forEach(c => {
          configNames.push({ metric_provider: provider, config_name: c.getString('name') });
        });
      }
    });

    response.json({ data: configNames, status: 200 });
  });

  router.put('/:walletName/metrics_setting', async (request, response) => {
    await evaluateRequestPermission(request, {
      permission: permissions.infraWalletMetricSettingsCreate,
    });

    const readOnly = config.getOptionalBoolean('infraWallet.settings.readOnly') ?? false;

    if (readOnly) {
      response.status(403).json({ error: 'API not enabled in read-only mode', status: 403 });
      return;
    }

    const updatedMetricSetting = await updateOrInsertWalletMetricSetting(database, request.body as MetricSetting);
    response.json({ updated: updatedMetricSetting, status: 200 });
  });

  router.delete('/:walletName/metrics_setting', async (request, response) => {
    await evaluateRequestPermission(request, {
      permission: permissions.infraWalletMetricSettingsDelete,
    });

    const readOnly = config.getOptionalBoolean('infraWallet.settings.readOnly') ?? false;

    if (readOnly) {
      response.status(403).json({ error: 'API not enabled in read-only mode', status: 403 });
      return;
    }

    const deletedMetricSetting = await deleteWalletMetricSetting(database, request.body as MetricSetting);
    response.json({ deleted: deletedMetricSetting, status: 200 });
  });

  router.use(errorHandler());
  return router;
}
