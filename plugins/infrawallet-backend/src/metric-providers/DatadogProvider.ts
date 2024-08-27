import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { v1 as datadogApiV1, client as datadogClient } from '@datadog/datadog-api-client';
import moment from 'moment';
import { MetricProvider } from './MetricProvider';
import { Metric, MetricQuery } from '../service/types';

export class DatadogProvider extends MetricProvider {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new DatadogProvider('Datadog', config, database, cache, logger);
  }

  async initProviderClient(config: Config): Promise<any> {
    const apiKey = config.getString('apiKey');
    const applicationKey = config.getString('applicationKey');
    const ddSite = config.getString('ddSite');
    const configuration = datadogClient.createConfiguration({
      baseServer: new datadogClient.BaseServerConfiguration(ddSite, {}),
      authMethods: {
        apiKeyAuth: apiKey,
        appKeyAuth: applicationKey,
      },
    });
    const client = new datadogApiV1.MetricsApi(configuration);
    return client;
  }

  async fetchMetrics(_metricProviderConfig: Config, client: any, query: MetricQuery): Promise<any> {
    const params: datadogApiV1.MetricsApiQueryMetricsRequest = {
      from: parseInt(query.startTime, 10) / 1000,
      to: parseInt(query.endTime, 10) / 1000,
      query: query.query?.replaceAll('IW_INTERVAL', query.granularity === 'daily' ? '86400' : '2592000') as string,
    };
    return client.queryMetrics(params).then((data: datadogApiV1.MetricsQueryResponse) => {
      if (data.status === 'ok') {
        return data;
      }
      throw new Error(data.error);
    });
  }

  async transformMetricData(_metricProviderConfig: Config, query: MetricQuery, metricResponse: any): Promise<Metric[]> {
    const transformedData = [];

    for (const series of metricResponse.series) {
      const metricName = query.name as string;
      const tagSet = series.tagSet;

      const metric: Metric = {
        id: `${metricName} ${tagSet.length === 0 ? '' : tagSet}`,
        provider: this.providerName,
        name: metricName,
        reports: {},
      };

      for (const point of series.pointlist) {
        const period = moment(point[0]).format(query.granularity === 'daily' ? 'YYYY-MM-DD' : 'YYYY-MM');
        const value = point[1];
        metric.reports[period] = value;
      }

      transformedData.push(metric);
    }

    return transformedData;
  }
}
