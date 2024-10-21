import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { reduce } from 'lodash';
import moment from 'moment';
import { getCustomCostsByDateRange } from '../models/CustomCost';
import { CLOUD_PROVIDER, GRANULARITY } from '../service/consts';
import { CostQuery, Report } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';
import { getDailyPeriodStringsForOneMonth } from '../service/functions';

export class CustomCostClient extends InfraWalletClient {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new CustomCostClient(CLOUD_PROVIDER.CUSTOM, config, database, cache, logger);
  }

  protected async initCloudClient(_config: Config): Promise<any> {
    return null;
  }

  protected async fetchCosts(_integrationConfig: Config, _client: any, query: CostQuery): Promise<any> {
    const records = getCustomCostsByDateRange(
      this.database,
      moment(parseInt(query.startTime, 10)).toDate(),
      moment(parseInt(query.endTime, 10)).toDate(),
    );
    return records;
  }

  protected async transformCostsData(subAccountConfig: Config, query: CostQuery, costResponse: any): Promise<Report[]> {
    const accountName = subAccountConfig.getString('name');

    const transformedData = reduce(
      costResponse,
      (accumulator: { [key: string]: Report }, record) => {
        let periodFormat = 'YYYY-MM';
        if (query.granularity === GRANULARITY.DAILY) {
          periodFormat = 'YYYY-MM-DD';
        }

        const keyName = `${accountName}-${record.provider}-${record.account}-${record.service}`;

        // make it compatible with SQLite database
        if (typeof record.tags === 'string') {
          try {
            record.tags = JSON.parse(record.tags);
          } catch (error) {
            this.logger.error(`Failed to parse tags for custom cost ${keyName}, tags: ${record.tags}`);
            record.tags = {};
          }
        }

        if (!accumulator[keyName]) {
          accumulator[keyName] = {
            id: keyName,
            account: `${this.provider}/${accountName}`,
            service: record.service,
            category: record.category,
            provider: record.provider,
            type: 'Custom Cost',
            reports: {},
          };
        }

        // if custom costs with same provider+account+service values, but contain different tags
        // we merge these tags, but the tag with same key will be overriden
        accumulator[keyName] = { ...accumulator[keyName], ...record.tags };

        const cost = parseFloat(record.cost);
        if (query.granularity === GRANULARITY.MONTHLY) {
          const period = moment(record.usage_month.toString(), 'YYYYMM').format(periodFormat);
          accumulator[keyName].reports[period] = cost;
        } else {
          if (record.amortization_mode === 'average') {
            // calculate the average daily cost
            const periods = getDailyPeriodStringsForOneMonth(record.usage_month);
            const averageCost = parseFloat(record.cost) / periods.length;
            periods.forEach(period => {
              accumulator[keyName].reports[period] = averageCost;
            });
          } else if (record.amortization_mode === 'start_day') {
            const period = moment(record.usage_month.toString(), 'YYYYMM').startOf('month').format(periodFormat);
            accumulator[keyName].reports[period] = cost;
          } else {
            const period = moment(record.usage_month.toString(), 'YYYYMM').endOf('month').format(periodFormat);
            accumulator[keyName].reports[period] = cost;
          }
        }

        return accumulator;
      },
      {},
    );

    return Object.values(transformedData);
  }
}
