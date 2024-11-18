import { CacheService, DatabaseService, LoggerService, resolvePackagePath } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { promises as fsPromises } from 'fs';
import moment from 'moment';
import * as upath from 'upath';
import { CLOUD_PROVIDER, PROVIDER_TYPE } from '../service/consts';
import { CostQuery, Report } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';

export class MockClient extends InfraWalletClient {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new MockClient(CLOUD_PROVIDER.MOCK, config, database, cache, logger);
  }

  protected async initCloudClient(config: Config): Promise<any> {
    this.logger.debug(`MockClient.initCloudClient called with config: ${JSON.stringify(config)}`);

    return null;
  }

  protected async fetchCosts(_subAccountConfig: Config, _client: any, _query: CostQuery): Promise<any> {
    return null;
  }

  protected async transformCostsData(
    _subAccountConfig: Config,
    query: CostQuery,
    _costResponse: any,
  ): Promise<Report[]> {
    try {
      const startDate = moment.unix(Number(query.startTime) / 1000);
      let endDate = moment.unix(Number(query.endTime) / 1000);

      const mockDir = resolvePackagePath('@electrolux-oss/plugin-infrawallet-backend', 'mock');
      const mockFilePath = upath.join(mockDir, 'mock_response.json');
      const data = await fsPromises.readFile(mockFilePath, 'utf8');
      const jsonData: Report[] = JSON.parse(data);
      const currentDate = moment();

      if (endDate.isAfter(currentDate)) {
        endDate = currentDate.clone();
        endDate.add(1, 'day');
      }

      const processedData = await Promise.all(
        jsonData.map(async item => {
          item.providerType = PROVIDER_TYPE.INTEGRATION;
          item.reports = {};

          let tempDate = moment(startDate);
          if (item.provider === 'GCP') {
            // to simulate the scenario when there is no cost data for 1 month
            tempDate = tempDate.add(1, 'month');
          }

          let step: moment.unitOfTime.DurationConstructor = 'months';
          let dateFormat = 'YYYY-MM';

          if (query.granularity.toLowerCase() === 'daily') {
            step = 'days';
            dateFormat = 'YYYY-MM-DD';
          }

          while (tempDate.isBefore(endDate)) {
            const dateString = tempDate.format(dateFormat);

            if (query.granularity.toLowerCase() === 'monthly') {
              item.reports[dateString] = this.getRandomValue(0.4 * 30, 33.3 * 30);
            } else {
              item.reports[dateString] = this.getRandomValue(0.4, 33.3);
            }

            tempDate.add(1, step); // Step based on granularity
          }

          return item;
        }),
      );

      return processedData;
    } catch (err) {
      this.logger.error('Error while reading a file', err);
      throw err;
    }
  }

  getRandomValue(min: number, max: number): number {
    const random = Math.random();
    const amplifiedRandom = Math.pow(random, 3);
    return amplifiedRandom * (max - min) + min;
  }
}
