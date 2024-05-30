import { errorHandler } from '@backstage/backend-common';
import {
  CacheService,
  DatabaseService,
  LoggerService,
} from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { JsonArray } from '@backstage/types';
import express from 'express';
import Router from 'express-promise-router';
import { AwsClient } from './AwsClient';
import { AzureClient } from './AzureClient';
import { InfraWalletApi } from './InfraWalletApi';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  cache: CacheService;
  database: DatabaseService;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config, cache, database } = options;

  const router = Router();
  router.use(express.json());

  const azureClient = AzureClient.create(config, database);
  const awsClient = AwsClient.create(config, database);
  const cloudClients: InfraWalletApi[] = [azureClient, awsClient];

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
    const promises = [];
    const results = [];

    cloudClients.forEach(async client => {
      const fetchCloudCosts = (async () => {
        const cacheKey = [
          client.constructor.name,
          filters,
          groups,
          granularity,
          startTime,
          endTime,
        ].join('_');
        const cachedCosts = (await cache.get(cacheKey)) as JsonArray;
        if (cachedCosts) {
          logger.debug(`${client.constructor.name} costs from cache`);
          cachedCosts.forEach(cost => {
            results.push(cost);
          });
        } else {
          const costs = await client.fetchCostsFromCloud({
            filters: filters,
            groups: groups,
            granularity: granularity,
            startTime: startTime,
            endTime: endTime,
          });
          await cache.set(cacheKey, costs, {
            ttl: 60 * 60 * 2 * 1000,
          }); // cache for 2 hours
          costs.forEach(cost => {
            results.push(cost);
          });
        }
      })();
      promises.push(fetchCloudCosts);
    });

    await Promise.all(promises);

    response.json({ data: results, status: 'ok' });
  });

  router.use(errorHandler());
  return router;
}
