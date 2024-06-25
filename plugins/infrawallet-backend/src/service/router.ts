import { errorHandler } from '@backstage/backend-common';
import { CacheService, DatabaseService, LoggerService, resolvePackagePath } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { AwsClient } from './AwsClient';
import { AzureClient } from './AzureClient';
import { GCPClient } from './GCPClient';
import { InfraWalletApi } from './InfraWalletApi';
import { CloudProviderError, Report } from './types';

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

  const azureClient = AzureClient.create(config, database, cache, logger);
  const awsClient = AwsClient.create(config, database, cache, logger);
  const gcpClient = GCPClient.create(config, database, cache, logger);
  const cloudClients: InfraWalletApi[] = [azureClient, awsClient, gcpClient];

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

    cloudClients.forEach(async client => {
      const fetchCloudCosts = (async () => {
        try {
          const clientResponse = await client.fetchCostsFromCloud({
            filters: filters,
            groups: groups,
            granularity: granularity,
            startTime: startTime,
            endTime: endTime,
          });
          clientResponse.errors.forEach(e => {
            errors.push(e);
          });
          clientResponse.reports.forEach(cost => {
            results.push(cost);
          });
        } catch (e) {
          logger.error(e);
        }
      })();
      promises.push(fetchCloudCosts);
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
