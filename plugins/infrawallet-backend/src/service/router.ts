import { errorHandler } from '@backstage/backend-common';
import { CacheService, DatabaseService, LoggerService, resolvePackagePath } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import {
  deleteWalletMetricSetting,
  getWallet,
  getWalletMetricSettings,
  updateOrInsertWalletMetricSetting,
} from '../controllers/MetricSettingController';
import { InfraWalletClient } from '../cost-clients/InfraWalletClient';
import { MetricProvider } from '../metric-providers/MetricProvider';
import { Budget, getBudget, getBudgets, upsertBudget } from '../models/Budget';
import {
  createCustomCosts,
  CustomCost,
  deleteCustomCost,
  getCustomCosts,
  updateOrInsertCustomCost,
} from '../models/CustomCost';
import { CategoryMappingService } from './CategoryMappingService';
import { COST_CLIENT_MAPPINGS, METRIC_PROVIDER_MAPPINGS } from './consts';
import { parseFilters, parseTags, tagsToString } from './functions';
import { CloudProviderError, Metric, MetricSetting, Report, Tag } from './types';

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

  // init CategoryMappingService
  CategoryMappingService.initInstance(cache, logger);

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/reports', async (request, response) => {
    const filters = request.query.filters as string;
    const tags = parseTags(request.query.tags as string);
    const groups = request.query.groups as string;
    const granularity = request.query.granularity as string;
    const startTime = request.query.startTime as string;
    const endTime = request.query.endTime as string;
    const promises: Promise<void>[] = [];
    const results: Report[] = [];
    const errors: CloudProviderError[] = [];

    // group tags by providers
    const providerTags: Record<string, Tag[]> = {};
    for (const tag of tags) {
      const provider = tag.provider.toLowerCase();
      if (!providerTags[provider]) {
        providerTags[provider] = [];
      }

      providerTags[provider].push(tag);
    }

    const categoryMappingService = CategoryMappingService.getInstance();
    await categoryMappingService.refreshCategoryMappings();

    const conf = config.getConfig('backend.infraWallet.integrations');
    // concat['custom'] : always enable custom cost
    conf
      .keys()
      .concat(['custom'])
      .forEach((provider: string) => {
        if (provider in COST_CLIENT_MAPPINGS) {
          const client: InfraWalletClient = COST_CLIENT_MAPPINGS[provider].create(config, database, cache, logger);
          const fetchCloudCosts = (async () => {
            try {
              const clientResponse = await client.getCostReports({
                filters: filters,
                tags: tagsToString(providerTags[provider.toLowerCase()]),
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

    const parsedFilters = parseFilters(filters);

    const filteredResults = results.filter(report => {
      return Object.entries(parsedFilters).every(([key, values]) => {
        const reportValue = report[key];
        if (typeof reportValue !== 'string') {
          return false;
        }
        return values.includes(reportValue);
      });
    });

    if (errors.length > 0) {
      response.status(207).json({ data: filteredResults, errors: errors, status: 207 });
    } else {
      response.json({ data: filteredResults, errors: errors, status: 200 });
    }
  });

  router.get('/tag-keys', async (request, response) => {
    const tags: Tag[] = [];
    const errors: CloudProviderError[] = [];

    const tagProvider = request.query.provider as string;
    const startTime = request.query.startTime as string;
    const endTime = request.query.endTime as string;
    const promises: Promise<void>[] = [];

    const conf = config.getConfig('backend.infraWallet.integrations');
    conf.keys().forEach((provider: string) => {
      if (provider.toLowerCase() === tagProvider.toLowerCase() && provider in COST_CLIENT_MAPPINGS) {
        const client: InfraWalletClient = COST_CLIENT_MAPPINGS[provider].create(config, database, cache, logger);
        const getTagKeys = (async () => {
          try {
            const clientResponse = await client.getTagKeys({
              startTime: startTime,
              endTime: endTime,
            });
            clientResponse.errors.forEach((e: CloudProviderError) => {
              errors.push(e);
            });
            clientResponse.tags.forEach((tag: Tag) => {
              tags.push(tag);
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
        promises.push(getTagKeys);
      }
    });

    await Promise.all(promises);

    if (errors.length > 0) {
      response.status(207).json({ data: tags, errors: errors, status: 207 });
    } else {
      response.json({ data: tags, errors: errors, status: 200 });
    }
  });

  router.get('/tag-values', async (request, response) => {
    const tags: Tag[] = [];
    const errors: CloudProviderError[] = [];

    const startTime = request.query.startTime as string;
    const endTime = request.query.endTime as string;
    const tagKey = request.query.tag as string;
    const tagProvider = request.query.provider as string;
    const promises: Promise<void>[] = [];

    const conf = config.getConfig('backend.infraWallet.integrations');
    conf.keys().forEach((provider: string) => {
      if (provider in COST_CLIENT_MAPPINGS && provider.toLowerCase() === tagProvider.toLowerCase()) {
        const client: InfraWalletClient = COST_CLIENT_MAPPINGS[provider].create(config, database, cache, logger);
        const getTagValues = (async () => {
          try {
            const clientResponse = await client.getTagValues(
              {
                startTime: startTime,
                endTime: endTime,
              },
              tagKey,
            );
            clientResponse.errors.forEach((e: CloudProviderError) => {
              errors.push(e);
            });
            clientResponse.tags.forEach((tag: Tag) => {
              tags.push(tag);
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
        promises.push(getTagValues);
      }
    });

    await Promise.all(promises);

    if (errors.length > 0) {
      response.status(207).json({ data: tags, errors: errors, status: 207 });
    } else {
      response.json({ data: tags, errors: errors, status: 200 });
    }
  });

  router.get('/:walletName/budgets', async (request, response) => {
    const walletName = request.params.walletName;
    const provider = request.query.provider as string;
    let budgets;

    if (provider) {
      budgets = await getBudget(database, walletName, provider);
    } else {
      budgets = await getBudgets(database, walletName);
    }

    response.json({ data: budgets, status: 200 });
  });

  router.put('/:walletName/budgets', async (request, response) => {
    const walletName = request.params.walletName;
    const result = await upsertBudget(database, walletName, request.body as Budget);
    response.json({ updated: result, status: 200 });
  });

  router.get('/custom-costs', async (_request, response) => {
    const customCosts = await getCustomCosts(database);

    // make it compatible with the SQLite database
    for (const cost of customCosts) {
      if (typeof cost.tags === 'string') {
        try {
          cost.tags = JSON.parse(cost.tags);
        } catch (error) {
          cost.tags = {};
        }
      }
    }

    response.json({ data: customCosts, status: 200 });
  });

  router.post('/custom-costs', async (request, response) => {
    const readOnly = config.getOptionalBoolean('infraWallet.settings.readOnly') ?? false;

    if (readOnly) {
      response.status(403).json({ error: 'API not enabled in read-only mode', status: 403 });
      return;
    }

    const updatedCustomCost = await createCustomCosts(database, request.body as CustomCost[]);
    response.json({ created: updatedCustomCost, status: 200 });
  });

  router.put('/custom-cost', async (request, response) => {
    const readOnly = config.getOptionalBoolean('infraWallet.settings.readOnly') ?? false;

    if (readOnly) {
      response.status(403).json({ error: 'API not enabled in read-only mode', status: 403 });
      return;
    }

    const updatedCustomCost = await updateOrInsertCustomCost(database, request.body as CustomCost);
    response.json({ updated: updatedCustomCost, status: 200 });
  });

  router.delete('/custom-cost', async (request, response) => {
    const readOnly = config.getOptionalBoolean('infraWallet.settings.readOnly') ?? false;

    if (readOnly) {
      response.status(403).json({ error: 'API not enabled in read-only mode', status: 403 });
      return;
    }

    const deletedCustomCost = await deleteCustomCost(database, request.body as CustomCost);
    response.json({ deleted: deletedCustomCost, status: 200 });
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

  router.get('/:walletName/metrics-setting', async (request, response) => {
    const walletName = request.params.walletName;
    const metricSettings = await getWalletMetricSettings(database, walletName);
    response.json({ data: metricSettings, status: 200 });
  });

  router.get('/metric/metric-configs', async (_request, response) => {
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

  router.put('/:walletName/metrics-setting', async (request, response) => {
    const readOnly = config.getOptionalBoolean('infraWallet.settings.readOnly') ?? false;

    if (readOnly) {
      response.status(403).json({ error: 'API not enabled in read-only mode', status: 403 });
      return;
    }

    const updatedMetricSetting = await updateOrInsertWalletMetricSetting(database, request.body as MetricSetting);
    response.json({ updated: updatedMetricSetting, status: 200 });
  });

  router.delete('/:walletName/metrics-setting', async (request, response) => {
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
