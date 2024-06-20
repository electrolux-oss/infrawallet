import { LoggerService, DatabaseService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { BigQuery } from '@google-cloud/bigquery';
import { reduce } from 'lodash';
import { InfraWalletApi } from './InfraWalletApi';
import { CostQuery, Report } from './types';
import { getCategoryByServiceName, getCategoryMappings } from './functions';

export class GCPClient implements InfraWalletApi {
  static create(
    config: Config,
    database: DatabaseService,
    logger: LoggerService,
  ) {
    return new GCPClient(config, database, logger);
  }

  constructor(
    private readonly config: Config,
    private readonly database: DatabaseService,
    private readonly logger: LoggerService,
  ) {}

  convertServiceName(serviceName: string): string {
    let convertedName = serviceName;

    const prefixes = ['GCP'];

    for (const prefix of prefixes) {
      if (serviceName.startsWith(prefix)) {
        convertedName = serviceName.slice(prefix.length).trim();
      }
    }

    return `GCP/${convertedName}`;
  }

  async queryBigQuery(
    keyFilePath: string,
    projectId: string,
    datasetId: string,
    tableId: string,
    query: CostQuery,
  ) {
    // Configure a JWT auth client
    const options = {
      keyFilename: keyFilePath,
      projectId: projectId,
    };

    // Initialize the BigQuery API
    const bigquery = new BigQuery(options);
    try {
      const periodFormat = query.granularity.toUpperCase() === 'MONTHLY' ? '%Y-%m' : '%Y-%m-%d';
      const sql = `
        SELECT
          project.name AS project,
          service.description AS service,
          FORMAT_TIMESTAMP('${periodFormat}', usage_start_time) AS period,
          SUM(cost) AS total_cost
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
      const [job] = await bigquery.createQueryJob({
        query: sql,
        location: 'US',
      });

      // Wait for the query to finish
      const [rows] = await job.getQueryResults();

      return rows;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async fetchCostsFromCloud(query: CostQuery): Promise<Report[]> {
    const conf = this.config.getOptionalConfigArray(
      'backend.infraWallet.integrations.gcp',
    );
    if (!conf) {
      return [];
    }

    const promises = [];
    const results: Report[] = [];

    for (const c of conf) {
      const name = c.getString('name');
      const keyFilePath = c.getString('keyFilePath');
      const projectId = c.getString('projectId');
      const datasetId = c.getString('datasetId');
      const tableId = c.getString('tableId');
      const tags = c.getOptionalStringArray('tags');
      const tagKeyValues: { [key: string]: string } = {};
      tags?.forEach(tag => {
        const [k, v] = tag.split(':');
        tagKeyValues[k.trim()] = v.trim();
      });
      const categoryMappings = await getCategoryMappings(this.database, 'gcp');

      const promise = (async () => {
        try {
          const costResponse = await this.queryBigQuery(
            keyFilePath,
            projectId,
            datasetId,
            tableId,
            query,
          );
          const transformedData = reduce(
            costResponse,
            (acc: { [key: string]: Report }, row) => {
              const period = row.period;
              const keyName = `${name}_${row.project}_${row.service}`;

              if (!acc[keyName]) {
                acc[keyName] = {
                  id: keyName,
                  name: `GCP/${name}`,
                  service: this.convertServiceName(row.service),
                  category: getCategoryByServiceName(
                    row.service,
                    categoryMappings,
                  ),
                  provider: 'GCP',
                  reports: {},
                  ...{ project: row.project }, // TODO: how should we handle the project field? for now, we add project name as a field in the report
                  ...tagKeyValues, // note that if there is a tag `project:foo` in config, it overrides the project field set above
                };
              }

              acc[keyName].reports[period] = row.total_cost;

              return acc;
            },
            {},
          );

          Object.values(transformedData).map((value: any) => {
            results.push(value);
          });
        } catch (e) {
          this.logger.error(e);
        }
      })();
      promises.push(promise);
    }
    await Promise.all(promises);
    return results;
  }
}
