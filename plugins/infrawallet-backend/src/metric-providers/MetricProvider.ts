import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { getMetricsFromCache, setMetricsToCache } from '../service/functions';
import { CloudProviderError, Metric, MetricQuery, MetricSetting, MetricResponse } from '../service/types';

export abstract class MetricProvider {
  constructor(
    protected readonly providerName: string,
    protected readonly config: Config,
    protected readonly database: DatabaseService,
    protected readonly cache: CacheService,
    protected readonly logger: LoggerService,
  ) {}

  abstract initProviderClient(metricProviderConfig: Config): Promise<any>;

  abstract fetchMetrics(metricProviderConfig: Config, client: any, query: MetricQuery): Promise<any>;

  abstract transformMetricData(
    metricProviderConfig: Config,
    query: MetricQuery,
    metricResponse: any,
  ): Promise<Metric[]>;

  async getMetrics(query: MetricQuery): Promise<MetricResponse> {
    const conf = this.config.getOptionalConfigArray(
      `backend.infraWallet.metricProviders.${this.providerName.toLowerCase()}`,
    );
    if (!conf) {
      return { metrics: [], errors: [] };
    }

    const promises = [];
    const results: Metric[] = [];
    const errors: CloudProviderError[] = [];

    for (const c of conf) {
      const configName = c.getString('name');
      const client = await this.initProviderClient(c);
      const dbClient = await this.database.getClient();

      const metricSettings = await dbClient
        .where({
          'wallets.name': query.walletName,
          'business_metrics.metric_provider': this.providerName.toLowerCase(),
          'business_metrics.config_name': configName,
        })
        .select('business_metrics.*')
        .from<MetricSetting>('business_metrics')
        .join('wallets', 'business_metrics.wallet_id', '=', 'wallets.id');

      for (const metric of metricSettings || []) {
        const promise = (async () => {
          try {
            const fullQuery: MetricQuery = {
              name: metric.metric_name,
              query: metric.query,
              ...query,
            };

            // first check if there is any cached metrics
            const cachedMetrics = await getMetricsFromCache(this.cache, this.providerName, configName, fullQuery);
            if (cachedMetrics) {
              this.logger.debug(`${this.providerName}/${configName}/${fullQuery.name} metrics from cache`);
              cachedMetrics.forEach(m => {
                results.push({
                  group: metric.group, // add group info to the metric
                  ...m,
                });
              });
              return;
            }

            const metricResponse = await this.fetchMetrics(c, client, fullQuery);
            const transformedMetrics = await this.transformMetricData(c, fullQuery, metricResponse);

            // cache the results for 2 hours
            await setMetricsToCache(
              this.cache,
              transformedMetrics,
              this.providerName,
              configName,
              fullQuery,
              60 * 60 * 2 * 1000,
            );

            transformedMetrics.forEach((value: any) => {
              results.push({
                group: metric.group, // add group info to the metric
                ...value,
              });
            });
          } catch (e) {
            this.logger.error(e);
            errors.push({
              provider: this.providerName,
              name: `${this.providerName}/${configName}/${metric.getString('metricName')}`,
              error: e.message,
            });
          }
        })();
        promises.push(promise);
      }
    }
    await Promise.all(promises);
    return {
      metrics: results,
      errors: errors,
    };
  }
}
