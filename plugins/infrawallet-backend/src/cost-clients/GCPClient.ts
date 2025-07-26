import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { BigQuery } from '@google-cloud/bigquery';
import { existsSync } from 'fs';
import { reduce } from 'lodash';
import { homedir } from 'os';
import { join } from 'path';
import { CategoryMappingService } from '../service/CategoryMappingService';
import { CLOUD_PROVIDER, PROVIDER_TYPE, GRANULARITY } from '@electrolux-oss/plugin-infrawallet-node';
import { parseCost } from '../service/functions';
import { CostQuery, Report } from '@electrolux-oss/plugin-infrawallet-node';
import { InfraWalletClient } from '@electrolux-oss/plugin-infrawallet-node';

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

  /**
   * Resolves a file path, handling POSIX-style paths with environment variables and tilde expansion.
   * Supports:
   * - Relative paths: "./path/to/file.json"
   * - Absolute paths: "/path/to/file.json"
   * - Home directory: "~/path/to/file.json"
   * - Environment variables: "$HOME/path/to/file.json", "${HOME}/path/to/file.json"
   *
   * @param filePath The path to resolve
   * @returns The resolved path, or null if the path cannot be resolved
   */
  private resolvePath(filePath: string): string | null {
    try {
      let resolvedPath = filePath.replace(/\$([A-Za-z0-9_]+)|\$\{([A-Za-z0-9_]+)\}/g, (match, p1, p2) => {
        const varName = p1 || p2;
        const value = process.env[varName];
        if (!value) {
          this.logger.warn(`Environment variable ${varName} not found when resolving path: ${filePath}`);
          return match;
        }
        return value;
      });

      if (resolvedPath.startsWith('~')) {
        const homeDirectory = homedir();
        resolvedPath = join(homeDirectory, resolvedPath.substring(1));
      }

      if (!existsSync(resolvedPath)) {
        this.logger.warn(`File does not exist at resolved path: ${resolvedPath}`);
        return null;
      }

      return resolvedPath;
    } catch (error) {
      this.logger.error(`Error resolving path ${filePath}: ${error.message}`);
      return null;
    }
  }

  protected async initCloudClient(subAccountConfig: Config): Promise<any> {
    const projectId = subAccountConfig.getString('projectId');
    const options: any = { projectId };

    const adcEnvPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (adcEnvPath) {
      if (existsSync(adcEnvPath)) {
        this.logger.info(`Using GCP credentials from GOOGLE_APPLICATION_CREDENTIALS env var: ${adcEnvPath}`);
      } else {
        this.logger.warn(`GOOGLE_APPLICATION_CREDENTIALS points to non-existent file: ${adcEnvPath}`);
      }
    }

    const keyFilePath = subAccountConfig.getOptionalString('keyFilePath');

    if (keyFilePath) {
      const resolvedPath = this.resolvePath(keyFilePath);

      if (resolvedPath) {
        this.logger.info(`Using GCP credentials file at: ${resolvedPath}`);
        options.keyFilename = resolvedPath;

        if (adcEnvPath) {
          this.logger.info('Overriding GOOGLE_APPLICATION_CREDENTIALS with keyFilePath from config');
        }
      } else {
        this.logger.info(
          `GCP credentials file not found at ${keyFilePath}, falling back to application default credentials`,
        );
      }
    } else if (!adcEnvPath) {
      this.logger.info(
        'No keyFilePath or GOOGLE_APPLICATION_CREDENTIALS specified, using application default credentials',
      );
    }

    const bigqueryClient = new BigQuery(options);
    return bigqueryClient;
  }

  protected async fetchCosts(subAccountConfig: Config, client: any, query: CostQuery): Promise<any> {
    const projectId = subAccountConfig.getString('projectId');
    const datasetId = subAccountConfig.getString('datasetId');
    const tableId = subAccountConfig.getString('tableId');

    try {
      const periodFormat = query.granularity === GRANULARITY.MONTHLY ? '%Y-%m' : '%Y-%m-%d';
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

      const [job] = await client.createQueryJob({
        query: sql,
      });

      const [rows] = await job.getQueryResults();
      return rows;
    } catch (err) {
      this.logger.error(`Error executing BigQuery: ${err.message}`);
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

        acc[keyName].reports[period] = parseCost(row.total_cost);
        return acc;
      },
      {},
    );

    return Object.values(transformedData);
  }
}
