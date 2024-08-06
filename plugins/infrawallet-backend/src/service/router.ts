import { errorHandler } from '@backstage/backend-common';
import { CacheService, DatabaseService, LoggerService, resolvePackagePath } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { InfraWalletClient } from './InfraWalletClient';
import { MetricProvider } from './MetricProvider';
import { COST_CLIENT_MAPPINGS, METRIC_PROVIDER_MAPPINGS } from './consts';
import { CloudProviderError, Metric, Report } from './types';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  cache: CacheService;
  database: DatabaseService;
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
  const { logger, config, cache, database } = options;
  // do database migrations here to support the legacy backend system
  await setUpDatabase(database);

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/reports', async (request, response) => {
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

  router.get('/metrics', async (request, response) => {
    const granularity = request.query.granularity as string;
    const startTime = request.query.startTime as string;
    const endTime = request.query.endTime as string;
    const promises: Promise<void>[] = [];
    const results: Metric[] = [];
    const errors: CloudProviderError[] = [];

    const conf = config.getConfig('backend.infraWallet.metricProviders');
    conf.keys().forEach((provider: string) => {
      if (provider in METRIC_PROVIDER_MAPPINGS) {
        const client: MetricProvider = METRIC_PROVIDER_MAPPINGS[provider].create(config, cache, logger);
        const fetchMetrics = (async () => {
          try {
            const metricResponse = await client.getMetrics({
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

  router.use(errorHandler());
  return router;
}
