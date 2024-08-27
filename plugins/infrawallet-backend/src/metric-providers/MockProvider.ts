import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import moment from 'moment';
import { MetricProvider } from './MetricProvider';
import { Metric, MetricQuery } from '../service/types';

export class MockProvider extends MetricProvider {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new MockProvider('Mock', config, database, cache, logger);
  }

  async initProviderClient(_config: Config): Promise<any> {
    // for now we don't need to use Grafana Cloud SDK
    return null;
  }

  async fetchMetrics(_metricProviderConfig: Config, _client: any, _query: MetricQuery): Promise<any> {
    return null;
  }

  async transformMetricData(
    _metricProviderConfig: Config,
    query: MetricQuery,
    _metricResponse: any,
  ): Promise<Metric[]> {
    const transformedData = [];

    const metricName = query.name as string;
    let mockSettings: { min?: number; max?: number } = {};
    try {
      mockSettings = JSON.parse(query.query as string);
    } catch (e) {
      // nothing needs to be done
    }
    const minValue = mockSettings.min ?? 0;
    const maxValue = mockSettings.max ?? 1000;
    const metric: Metric = {
      id: metricName,
      provider: this.providerName,
      name: metricName,
      reports: {},
    };

    let cursor = moment(parseInt(query.startTime, 10));
    while (cursor <= moment(parseInt(query.endTime, 10))) {
      const period = cursor.format(query.granularity === 'daily' ? 'YYYY-MM-DD' : 'YYYY-MM');
      metric.reports[period] = Math.floor(Math.random() * (maxValue - minValue) + minValue);
      cursor = cursor.add(1, query.granularity === 'daily' ? 'days' : 'months');
    }

    transformedData.push(metric);
    return transformedData;
  }
}
