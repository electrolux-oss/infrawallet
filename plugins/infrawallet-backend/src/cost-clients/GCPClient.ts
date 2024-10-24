import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { BigQuery } from '@google-cloud/bigquery';
import { reduce } from 'lodash';
import { CategoryMappingService } from '../service/CategoryMappingService';
import { CLOUD_PROVIDER, PROVIDER_TYPE } from '../service/consts';
import { CostQuery, Report } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';

export class GCPClient extends InfraWalletClient {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new GCPClient(CLOUD_PROVIDER.GCP, config, database, cache, logger);
  }

  protected convertServiceName(serviceName: string): string {
    let convertedName = serviceName;

    const prefixes = ['Google Cloud'];

    for (const prefix of prefixes) {
      if (serviceName.startsWith(prefix)) {
        convertedName = serviceName.slice(prefix.length).trim();
      }
    }

    return `${this.provider}/${convertedName}`;
  }

  protected async initCloudClient(subAccountConfig: Config): Promise<any> {
    const keyFilePath = subAccountConfig.getString('keyFilePath');
    const projectId = subAccountConfig.getString('projectId');
    // Configure a JWT auth client
    const options = {
      keyFilename: keyFilePath,
      projectId: projectId,
    };

    // Initialize the BigQuery API
    const bigqueryClient = new BigQuery(options);

    return bigqueryClient;
  }

  protected async fetchCosts(subAccountConfig: Config, client: any, query: CostQuery): Promise<any> {
    const projectId = subAccountConfig.getString('projectId');
    const datasetId = subAccountConfig.getString('datasetId');
    const tableId = subAccountConfig.getString('tableId');

    try {
      const periodFormat = query.granularity.toUpperCase() === 'MONTHLY' ? '%Y-%m' : '%Y-%m-%d';
      const sql = `
        SELECT
          project.name AS project,
          service.description AS service,
          FORMAT_TIMESTAMP('${periodFormat}', usage_start_time) AS period,
          (SUM(CAST(cost AS NUMERIC)) + SUM(IFNULL((SELECT SUM(CAST(c.amount AS NUMERIC)) FROM UNNEST(credits) AS c), 0))) AS total_cost
        FROM
          \`${projectId}.${datasetId}.${tableId}\`
        WHERE
          project.name IS NOT NULL
          AND cost > 0
          AND usage_start_time >= TIMESTAMP_MILLIS(${query.startTime})
          AND usage_start_time <= TIMESTAMP_MILLIS(${query.endTime})
        GROUP BY
          project, service, period
        ORDER BY
          project, period, total_cost DESC`;

      // Run the query as a job
      const [job] = await client.createQueryJob({
        query: sql,
      });

      // Wait for the query to finish
      const [rows] = await job.getQueryResults();

      return rows;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  protected async transformCostsData(
    subAccountConfig: Config,
    _query: CostQuery,
    costResponse: any,
  ): Promise<Report[]> {
    const categoryMappingService = CategoryMappingService.getInstance();
    const accountName = subAccountConfig.getString('name');
    const tags = subAccountConfig.getOptionalStringArray('tags');
    const tagKeyValues: { [key: string]: string } = {};
    tags?.forEach(tag => {
      const [k, v] = tag.split(':');
      tagKeyValues[k.trim()] = v.trim();
    });
    const transformedData = reduce(
      costResponse,
      (acc: { [key: string]: Report }, row) => {
        const period = row.period;
        const keyName = `${accountName}_${row.project}_${row.service}`;

        if (!acc[keyName]) {
          acc[keyName] = {
            id: keyName,
            account: `${this.provider}/${accountName}`,
            service: this.convertServiceName(row.service),
            category: categoryMappingService.getCategoryByServiceName(this.provider, row.service),
            provider: this.provider,
            providerType: PROVIDER_TYPE.INTEGRATION,
            reports: {},
            ...{ project: row.project }, // TODO: how should we handle the project field? for now, we add project name as a field in the report
            ...tagKeyValues, // note that if there is a tag `project:foo` in config, it overrides the project field set above
          };
        }

        acc[keyName].reports[period] = parseFloat(row.total_cost);

        return acc;
      },
      {},
    );

    return Object.values(transformedData);
  }
}
