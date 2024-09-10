import { promises as fsPromises } from 'fs';
import moment from 'moment';
import { CostQuery, Report, TagsQuery } from '../service/types';
import * as upath from 'upath';
import { InfraWalletClient } from './InfraWalletClient';
import { CacheService, DatabaseService, LoggerService, resolvePackagePath } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { CLOUD_PROVIDER } from '../service/consts';

export class MockClient extends InfraWalletClient {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new MockClient(CLOUD_PROVIDER.MOCK, config, database, cache, logger);
  }

  protected async initCloudClient(config: Config): Promise<any> {
    this.logger.debug(`MockClient.initCloudClient called with config: ${JSON.stringify(config)}`);

    return null;
  }

  protected async fetchTagKeys(
    _subAccountConfig: Config,
    _client: any,
    _query: TagsQuery,
  ): Promise<{ tagKeys: string[]; provider: CLOUD_PROVIDER }> {
    return { tagKeys: [], provider: CLOUD_PROVIDER.MOCK };
  }

  protected async fetchTagValues(
    _subAccountConfig: Config,
    _client: any,
    _query: TagsQuery,
    _tagKey: string,
  ): Promise<{ tagValues: string[]; provider: CLOUD_PROVIDER }> {
    return { tagValues: [], provider: CLOUD_PROVIDER.MOCK };
  }

  protected async fetchCosts(_subAccountConfig: Config, _client: any, _query: CostQuery): Promise<any> {
    return null;
  }

  protected async transformCostsData(
    _subAccountConfig: Config,
    query: CostQuery,
    _costResponse: any,
    _categoryMappings: { [service: string]: string },
  ): Promise<Report[]> {
    try {
      const startD = moment.unix(Number(query.startTime) / 1000);
      let endD = moment.unix(Number(query.endTime) / 1000);
      const mockDir = resolvePackagePath('@electrolux-oss/plugin-infrawallet-backend', 'mock');
      const mockFilePath = upath.join(mockDir, 'mock_response.json');
      const data = await fsPromises.readFile(mockFilePath, 'utf8');
      const jsonData: Report[] = JSON.parse(data);
      const currentDate = moment();

      if (endD.isAfter(currentDate)) {
        this.logger.warn('End Date is in the future, adjusting to current date.');
        endD = currentDate.clone();
        endD.add(1, 'day');
      }

      const processedData = await Promise.all(
        jsonData.map(async item => {
          item.reports = {};

          const StartDate = moment(startD);

          let step: moment.unitOfTime.DurationConstructor | undefined;
          let dateFormat = 'YYYY-MM';

          if (query.granularity.toLowerCase() === 'monthly') {
            step = 'months';
            dateFormat = 'YYYY-MM';
          } else if (query.granularity.toLowerCase() === 'daily') {
            step = 'days';
            dateFormat = 'YYYY-MM-DD';
          }

          while (StartDate.isBefore(endD)) {
            const dateString = StartDate.format(dateFormat);

            if (query.granularity.toLowerCase() === 'monthly') {
              item.reports[dateString] = this.getRandomValue(0.4 * 30, 33.3 * 30);
            } else {
              item.reports[dateString] = this.getRandomValue(0.4, 33.3);
            }

            StartDate.add(1, step); // Step based on granularity
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
