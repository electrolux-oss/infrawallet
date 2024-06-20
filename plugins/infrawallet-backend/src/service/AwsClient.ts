import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostAndUsageCommandInput,
  Granularity,
} from '@aws-sdk/client-cost-explorer';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { LoggerService, DatabaseService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { reduce } from 'lodash';
import moment from 'moment';
import { InfraWalletApi } from './InfraWalletApi';
import { CostQuery, Report } from './types';
import { getCategoryMappings, getCategoryByServiceName } from './functions';

export class AwsClient implements InfraWalletApi {
  static create(config: Config, database: DatabaseService, logger: LoggerService) {
    return new AwsClient(config, database, logger);
  }

  constructor(
    private readonly config: Config,
    private readonly database: DatabaseService,
    private readonly logger: LoggerService,
  ) {
  }

  convertServiceName(serviceName: string): string {
    let convertedName = serviceName;

    const prefixes = ['Amazon', 'AWS'];

    const aliases = new Map<string, string>([
      ['Elastic Compute Cloud - Compute', 'EC2 - Instances'],
      ['Virtual Private Cloud', 'VPC (Virtual Private Cloud)'],
      ['Relational Database Service', 'RDS (Relational Database Service)'],
      ['Simple Storage Service', 'S3 (Simple Storage Service)'],
      [
        'Managed Streaming for Apache Kafka',
        'MSK (Managed Streaming for Apache Kafka)',
      ],
      [
        'Elastic Container Service for Kubernetes',
        'EKS (Elastic Container Service for Kubernetes)',
      ],
      ['Simple Queue Service', 'SQS (Simple Queue Service)'],
      ['Simple Notification Service', 'SNS (Simple Notification Service)'],
    ]);

    for (const prefix of prefixes) {
      if (serviceName.startsWith(prefix)) {
        convertedName = serviceName.slice(prefix.length).trim();
      }
    }

    if (aliases.has(convertedName)) {
      convertedName = aliases.get(convertedName) || convertedName;
    }

    return `AWS/${convertedName}`;
  }

  async fetchCostsFromCloud(query: CostQuery): Promise<Report[]> {
    const conf = this.config.getOptionalConfigArray(
      'backend.infraWallet.integrations.aws',
    );
    if (!conf) {
      return [];
    }

    const promises = [];
    const results: Report[] = [];
    const groupPairs = [];
    query.groups.split(',').forEach(group => {
      if (group.includes(':')) {
        const [type, name] = group.split(':');
        groupPairs.push({ type, name });
      }
    });

    for (const c of conf) {
      const name = c.getString('name');
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
      const categoryMappings = await getCategoryMappings(this.database, 'aws');

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
              accessKeyId: assumeRoleResponse.Credentials
                ?.AccessKeyId as string,
              secretAccessKey: assumeRoleResponse.Credentials
                ?.SecretAccessKey as string,
              sessionToken: assumeRoleResponse.Credentials
                ?.SessionToken as string,
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
              const period = rowTime ? (query.granularity.toUpperCase() === 'MONTHLY' ? rowTime.substring(0, 7) : rowTime) : 'unknown';
              if (row.Groups) {
                row.Groups.forEach((group: any) => {
                  const groupKeys = group.Keys ? group.Keys[0] : '';
                  const keyName = `${name}_${groupKeys}`;

                  if (!accumulator[keyName]) {
                    accumulator[keyName] = {
                      id: keyName,
                      name: `AWS/${name}`,
                      service: this.convertServiceName(groupKeys),
                      category: getCategoryByServiceName(
                        groupKeys,
                        categoryMappings,
                      ),
                      provider: 'AWS',
                      reports: {},
                      ...tagKeyValues,
                    };
                  }

                  const groupMetrics = group.Metrics;

                  if (groupMetrics !== undefined) {
                    accumulator[keyName].reports[period] = parseFloat(
                      groupMetrics.UnblendedCost.Amount ?? '0.0',
                    );
                  }
                });
              }

              return accumulator;
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
