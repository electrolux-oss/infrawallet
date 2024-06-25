import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostAndUsageCommandInput,
  Granularity,
} from '@aws-sdk/client-cost-explorer';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { reduce } from 'lodash';
import moment from 'moment';
import { InfraWalletApi } from './InfraWalletApi';
import { getCategoryByServiceName, getCategoryMappings, getReportsFromCache, setReportsToCache } from './functions';
import { ClientResponse, CloudProviderError, CostQuery, Report } from './types';

export class AwsClient implements InfraWalletApi {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new AwsClient('AWS', config, database, cache, logger);
  }

  constructor(
    private readonly providerName: string,
    private readonly config: Config,
    private readonly database: DatabaseService,
    private readonly cache: CacheService,
    private readonly logger: LoggerService,
  ) {}

  convertServiceName(serviceName: string): string {
    let convertedName = serviceName;

    const prefixes = ['Amazon', 'AWS'];

    const aliases = new Map<string, string>([
      ['Elastic Compute Cloud - Compute', 'EC2 - Instances'],
      ['Virtual Private Cloud', 'VPC (Virtual Private Cloud)'],
      ['Relational Database Service', 'RDS (Relational Database Service)'],
      ['Simple Storage Service', 'S3 (Simple Storage Service)'],
      ['Managed Streaming for Apache Kafka', 'MSK (Managed Streaming for Apache Kafka)'],
      ['Elastic Container Service for Kubernetes', 'EKS (Elastic Container Service for Kubernetes)'],
      ['Elastic Container Service', 'ECS (Elastic Container Service)'],
      ['EC2 Container Registry (ECR)', 'ECR (Elastic Container Registry)'],
      ['Simple Queue Service', 'SQS (Simple Queue Service)'],
      ['Simple Notification Service', 'SNS (Simple Notification Service)'],
      ['Database Migration Service', 'DMS (Database Migration Service)'],
    ]);

    for (const prefix of prefixes) {
      if (serviceName.startsWith(prefix)) {
        convertedName = serviceName.slice(prefix.length).trim();
      }
    }

    if (aliases.has(convertedName)) {
      convertedName = aliases.get(convertedName) || convertedName;
    }

    return `${this.providerName}/${convertedName}`;
  }

  async fetchCostsFromCloud(query: CostQuery): Promise<ClientResponse> {
    const conf = this.config.getOptionalConfigArray('backend.infraWallet.integrations.aws');
    if (!conf) {
      return { reports: [], errors: [] };
    }

    const promises = [];
    const results: Report[] = [];
    const errors: CloudProviderError[] = [];
    const groupPairs = [];
    query.groups.split(',').forEach(group => {
      if (group.includes(':')) {
        const [type, name] = group.split(':');
        groupPairs.push({ type, name });
      }
    });

    for (const c of conf) {
      const name = c.getString('name');

      // first check if there is any cached
      const cachedCosts = await getReportsFromCache(this.cache, this.providerName, name, query);
      if (cachedCosts) {
        this.logger.debug(`${this.providerName}/${name} costs from cache`);
        cachedCosts.map(cost => {
          results.push(cost);
        });
        continue;
      }

      const accountId = c.getString('accountId');
      const assumedRoleName = c.getString('assumedRoleName');
      const accessKeyId = c.getOptionalString('accessKeyId');
      const accessKeySecret = c.getOptionalString('accessKeySecret');
      const tags = c.getOptionalStringArray('tags');
      const tagKeyValues: { [key: string]: string } = {};
      tags?.forEach(tag => {
        const [k, v] = tag.split(':');
        tagKeyValues[k.trim()] = v.trim();
      });
      const categoryMappings = await getCategoryMappings(this.database, this.providerName.toLowerCase());

      let stsParams = {};
      if (accessKeyId && accessKeySecret) {
        stsParams = {
          region: 'us-east-1',
          credentials: {
            accessKeyId: accessKeyId as string,
            secretAccessKey: accessKeySecret as string,
          },
        };
      } else {
        stsParams = {
          region: 'us-east-1',
        };
      }
      const promise = (async () => {
        try {
          const client = new STSClient(stsParams);
          const commandInput = {
            // AssumeRoleRequest
            RoleArn: `arn:aws:iam::${accountId}:role/${assumedRoleName}`,
            RoleSessionName: 'AssumeRoleSession1',
          };
          const assumeRoleCommand = new AssumeRoleCommand(commandInput);
          const assumeRoleResponse = await client.send(assumeRoleCommand);
          // init aws cost explorer client
          const awsCeClient = new CostExplorerClient({
            region: 'us-east-1',
            credentials: {
              accessKeyId: assumeRoleResponse.Credentials?.AccessKeyId as string,
              secretAccessKey: assumeRoleResponse.Credentials?.SecretAccessKey as string,
              sessionToken: assumeRoleResponse.Credentials?.SessionToken as string,
            },
          });

          // query this aws account's cost and usage using @aws-sdk/client-cost-explorer
          let costAndUsageResults: any[] = [];
          let nextPageToken = undefined;

          do {
            const input: GetCostAndUsageCommandInput = {
              TimePeriod: {
                Start: moment(parseInt(query.startTime, 10)).format('YYYY-MM-DD'),
                End: moment(parseInt(query.endTime, 10)).format('YYYY-MM-DD'),
              },
              Granularity: query.granularity.toUpperCase() as Granularity,
              Filter: { Dimensions: { Key: 'RECORD_TYPE', Values: ['Usage'] } },
              GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
              Metrics: ['UnblendedCost'],
              NextPageToken: nextPageToken,
            };

            const getCostCommand = new GetCostAndUsageCommand(input);
            const costAndUsageResponse = await awsCeClient.send(getCostCommand);

            costAndUsageResults = costAndUsageResults.concat(costAndUsageResponse.ResultsByTime);
            nextPageToken = costAndUsageResponse.NextPageToken;
          } while (nextPageToken);

          const transformedData = reduce(
            costAndUsageResults,
            (accumulator: { [key: string]: Report }, row) => {
              const rowTime = row.TimePeriod?.Start;
              let period = 'unknown';
              if (rowTime) {
                if (query.granularity.toUpperCase() === 'MONTHLY') {
                  period = rowTime.substring(0, 7);
                } else {
                  period = rowTime;
                }
              }
              if (row.Groups) {
                row.Groups.forEach((group: any) => {
                  const serviceName = group.Keys ? group.Keys[0] : '';
                  const keyName = `${name}_${serviceName}`;

                  if (!accumulator[keyName]) {
                    accumulator[keyName] = {
                      id: keyName,
                      name: `${this.providerName}/${name}`,
                      service: this.convertServiceName(serviceName),
                      category: getCategoryByServiceName(serviceName, categoryMappings),
                      provider: this.providerName,
                      reports: {},
                      ...tagKeyValues,
                    };
                  }

                  const groupMetrics = group.Metrics;

                  if (groupMetrics !== undefined) {
                    accumulator[keyName].reports[period] = parseFloat(groupMetrics.UnblendedCost.Amount ?? '0.0');
                  }
                });
              }

              return accumulator;
            },
            {},
          );

          // cache the results for 2 hours
          await setReportsToCache(
            this.cache,
            Object.values(transformedData),
            this.providerName,
            name,
            query,
            60 * 60 * 2 * 1000,
          );

          Object.values(transformedData).map((value: any) => {
            results.push(value);
          });
        } catch (e) {
          this.logger.error(e);
          errors.push({
            provider: this.providerName,
            name: `${this.providerName}/${name}`,
            error: e.message,
          });
        }
      })();
      promises.push(promise);
    }
    await Promise.all(promises);
    return {
      reports: results,
      errors: errors,
    };
  }
}
