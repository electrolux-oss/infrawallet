import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { reduce } from 'lodash';
import moment from 'moment';
import { getCustomCostsByDateRange } from '../models/CustomCost';
import { CACHE_CATEGORY, CLOUD_PROVIDER, PROVIDER_TYPE, GRANULARITY } from '../service/consts';
import {
  getDailyPeriodStringsForOneMonth,
  getDefaultCacheTTL,
  getReportsFromCache,
  setReportsToCache,
} from '../service/functions';
import { ClientResponse, CloudProviderError, CostQuery, Report } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';
import { CustomCostRecordSchema } from '../schemas/CustomProviderBilling';
import { ZodError } from 'zod';

export class CustomProviderClient extends InfraWalletClient {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new CustomProviderClient(CLOUD_PROVIDER.CUSTOM, config, database, cache, logger);
  }

  protected async initCloudClient(_config: Config): Promise<any> {
    return null;
  }

  protected async fetchCosts(_integrationConfig: Config | null, _client: any, query: CostQuery): Promise<any> {
    const records = getCustomCostsByDateRange(
      this.database,
      moment(parseInt(query.startTime, 10)).toDate(),
      moment(parseInt(query.endTime, 10)).toDate(),
    );
    return records;
  }

  protected async transformCostsData(
    _subAccountConfig: Config | null,
    query: CostQuery,
    costResponse: any,
  ): Promise<Report[]> {
    if (Array.isArray(costResponse)) {
      try {
        costResponse.forEach((record: any) => CustomCostRecordSchema.parse(record));
        this.logger.debug(`Custom cost records validation passed for ${costResponse.length} records`);
      } catch (error) {
        if (error instanceof ZodError) {
          this.logger.warn(`Custom cost records validation failed: ${error.message}`);
          this.logger.debug(`Sample validation errors: ${JSON.stringify(error.errors.slice(0, 3))}`);
        } else {
          this.logger.warn(`Unexpected validation error: ${error.message}`);
        }
      }
    }

    // Initialize tracking variables
    let processedRecords = 0;
    let filteredOutZeroAmount = 0;
    let filteredOutMissingFields = 0;
    const filteredOutInvalidDate = 0;
    const filteredOutTimeRange = 0;
    const uniqueKeys = new Set<string>();
    const totalRecords = Array.isArray(costResponse) ? costResponse.length : 0;

    const transformedData = reduce(
      costResponse,
      (accumulator: { [key: string]: Report }, record) => {
        // Check for missing fields
        if (
          !record.provider ||
          !record.account ||
          !record.service ||
          !record.category ||
          record.cost === undefined ||
          record.cost === null ||
          !record.usage_month
        ) {
          filteredOutMissingFields++;
          return accumulator;
        }

        const cost = parseFloat(record.cost);

        // Check for zero amount
        if (cost === 0) {
          filteredOutZeroAmount++;
          return accumulator;
        }

        let periodFormat = 'YYYY-MM';
        if (query.granularity === GRANULARITY.DAILY) {
          periodFormat = 'YYYY-MM-DD';
        }

        const keyName = `${record.provider}-${record.account}-${record.service}`;

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
          uniqueKeys.add(keyName);
          accumulator[keyName] = {
            id: keyName,
            account: record.account,
            service: record.service,
            category: record.category,
            provider: record.provider,
            providerType: PROVIDER_TYPE.CUSTOM,
            reports: {},
          };
        }

        // if custom costs with same provider+account+service values, but contain different tags
        // we merge these tags, but the tag with same key will be overriden
        accumulator[keyName] = { ...accumulator[keyName], ...record.tags };

        if (query.granularity === GRANULARITY.MONTHLY) {
          const period = moment(record.usage_month.toString(), 'YYYYMM').format(periodFormat);
          accumulator[keyName].reports[period] = cost;
          processedRecords++;
        } else {
          if (record.amortization_mode === 'average') {
            // calculate the average daily cost
            const periods = getDailyPeriodStringsForOneMonth(record.usage_month);
            const averageCost = parseFloat(record.cost) / periods.length;
            periods.forEach(period => {
              accumulator[keyName].reports[period] = averageCost;
            });
            processedRecords += periods.length;
          } else if (record.amortization_mode === 'start_day') {
            const period = moment(record.usage_month.toString(), 'YYYYMM').startOf('month').format(periodFormat);
            accumulator[keyName].reports[period] = cost;
            processedRecords++;
          } else {
            const period = moment(record.usage_month.toString(), 'YYYYMM').endOf('month').format(periodFormat);
            accumulator[keyName].reports[period] = cost;
            processedRecords++;
          }
        }

        return accumulator;
      },
      {},
    );

    this.logTransformationSummary({
      processed: processedRecords,
      uniqueReports: uniqueKeys.size,
      zeroAmount: filteredOutZeroAmount,
      missingFields: filteredOutMissingFields,
      invalidDate: filteredOutInvalidDate,
      timeRange: filteredOutTimeRange,
      totalRecords,
    });

    return Object.values(transformedData);
  }

  // override this method so that we do not read from the config file
  async getCostReports(query: CostQuery): Promise<ClientResponse> {
    const results: Report[] = [];
    const errors: CloudProviderError[] = [];

    // first check if there is any cached
    const cachedCosts = await getReportsFromCache(this.cache, this.provider, 'custom', query);
    if (cachedCosts) {
      this.logger.debug(`${this.provider} costs from cache`);
      cachedCosts.forEach(cost => {
        results.push(cost);
      });
    }

    try {
      const costResponse = await this.fetchCosts(null, null, query);

      const transformedReports = await this.transformCostsData(null, query, costResponse);

      // cache the results
      await setReportsToCache(
        this.cache,
        transformedReports,
        this.provider,
        'custom',
        query,
        getDefaultCacheTTL(CACHE_CATEGORY.COSTS, this.provider),
      );

      transformedReports.forEach((value: any) => {
        results.push(value);
      });
    } catch (e) {
      this.logger.error(e);
      errors.push({
        provider: this.provider,
        name: this.provider,
        error: e.message,
      });
    }
    return {
      reports: results,
      errors: errors,
    };
  }
}
