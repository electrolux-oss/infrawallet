import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  Granularity,
} from '@aws-sdk/client-cost-explorer';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { DatabaseService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { reduce } from 'lodash';
import moment from 'moment';
import { CostQuery, InfraWalletApi, Report } from './InfraWalletApi';
import { getCategoryMappings, getCategoryByServiceName } from './functions';

export class AwsClient implements InfraWalletApi {
  static create(config: Config, database: DatabaseService) {
    return new AwsClient(config, database);
  }

  constructor(
    private readonly config: Config,
    private readonly database: DatabaseService,
  ) {}

  async fetchCostsFromCloud(query: CostQuery): Promise<Report[]> {
    const conf = this.config.getOptionalConfigArray(
      'backend.infraWallet.integrations.aws',
    );
    if (!conf) {
      return [];
    }

    const promises = [];
    const results = [];
    const groupPairs = [];
    query.groups.split(',').forEach(group => {
      if (group.includes(':')) {
        const [type, name] = group.split(':');
        groupPairs.push({ type, name });
      }
    });

    for (const c of conf) {
      const name = c.getOptionalString('name');
      const accountId = c.getOptionalString('accountId');
      const assumedRoleName = c.getOptionalString('assumedRoleName');
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
            secretAccessKey: assumeRoleResponse.Credentials
              ?.SecretAccessKey as string,
            sessionToken: assumeRoleResponse.Credentials
              ?.SessionToken as string,
          },
        });

        // query this aws account's cost and usage using @aws-sdk/client-cost-explorer
        const input = {
          TimePeriod: {
            Start: moment(parseInt(query.startTime, 10)).format('YYYY-MM-DD'),
            End: moment(parseInt(query.endTime, 10)).format('YYYY-MM-DD'),
          },
          Granularity: query.granularity.toUpperCase() as Granularity,
          Filter: { Dimensions: { Key: 'RECORD_TYPE', Values: ['Usage'] } },
          GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
          Metrics: ['UnblendedCost'],
        };
        const getCostCommand = new GetCostAndUsageCommand(input);
        const costAndusageResponse = await awsCeClient.send(getCostCommand);

        const transformedData = reduce(
          costAndusageResponse.ResultsByTime,
          (acc, row) => {
            const period = row.TimePeriod.Start.substring(0, 7);
            row.Groups.forEach(group => {
              const keyName = `${name}_${group.Keys[0]}`;

              if (!acc[keyName]) {
                acc[keyName] = {
                  id: keyName,
                  name: name,
                  service: `${group.Keys[0]} (AWS)`,
                  category: getCategoryByServiceName(
                    group.Keys[0],
                    categoryMappings,
                  ),
                  provider: 'AWS',
                  reports: {},
                  ...tagKeyValues,
                };
              }

              acc[keyName].reports[period] = parseFloat(
                group.Metrics.UnblendedCost.Amount,
              );
            });
            return acc;
          },
          {},
        );

        Object.values(transformedData).map((value: any) => {
          results.push(value);
        });
      })();
      promises.push(promise);
    }
    await Promise.all(promises);
    return results;
  }
}
