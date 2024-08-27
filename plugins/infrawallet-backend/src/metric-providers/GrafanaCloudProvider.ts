import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import moment from 'moment';
import fetch from 'node-fetch';
import { MetricProvider } from './MetricProvider';
import { Metric, MetricQuery } from '../service/types';

export class GrafanaCloudProvider extends MetricProvider {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new GrafanaCloudProvider('GrafanaCloud', config, database, cache, logger);
  }

  async initProviderClient(_config: Config): Promise<any> {
    // for now we don't need to use Grafana Cloud SDK
    return null;
  }

  async fetchMetrics(metricProviderConfig: Config, _client: any, query: MetricQuery): Promise<any> {
    const url = metricProviderConfig.getString('url');
    const datasourceUid = metricProviderConfig.getString('datasourceUid');
    const token = metricProviderConfig.getString('token');

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    const payload = {
      queries: [
        {
          datasource: {
            uid: datasourceUid,
          },
          expr: query.query?.replaceAll('IW_INTERVAL', query.granularity === 'daily' ? '1d' : '30d'),
          refId: 'A',
        },
      ],
      from: query.startTime,
      to: query.endTime,
    };

    const response = await fetch(`${url}/api/ds/query`, {
      method: 'post',
      body: JSON.stringify(payload),
      headers: headers,
    });
    const data = await response.json();

    return data;
  }

  async transformMetricData(_metricProviderConfig: Config, query: MetricQuery, metricResponse: any): Promise<Metric[]> {
    const transformedData = [];

    const metricName = query.name as string;
    const metric: Metric = {
      id: metricName,
      provider: this.providerName,
      name: metricName,
      reports: {},
    };

    // TODO: iterate all the series
    const periods = metricResponse.results.A.frames[0].data.values[0];
    const values = metricResponse.results.A.frames[0].data.values[1];
    for (let i = 0; i < periods.length; i++) {
      const period = moment(periods[i]).format(query.granularity === 'daily' ? 'YYYY-MM-DD' : 'YYYY-MM');
      const value = values[i];
      metric.reports[period] = value;
    }

    transformedData.push(metric);
    return transformedData;
  }
}
