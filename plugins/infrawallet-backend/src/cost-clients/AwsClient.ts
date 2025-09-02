import {
  CostExplorerClient,
  Dimension,
  Expression,
  GetCostAndUsageCommand,
  GetCostAndUsageCommandInput,
  GetTagsCommand,
  GetTagsCommandInput,
  Granularity,
  GroupDefinitionType,
} from '@aws-sdk/client-cost-explorer';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { reduce } from 'lodash';
import moment from 'moment';
import { CategoryMappingService } from '../service/CategoryMappingService';
import { CLOUD_PROVIDER, PROVIDER_TYPE } from '../service/consts';
import { getBillingPeriod, parseCost, parseTags } from '../service/functions';
import { CostQuery, Report, TagsQuery } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';
import { AWSGetCostAndUsageResponseSchema, AWSGetTagsResponseSchema } from '../schemas/AWSBilling';
import { ZodError } from 'zod';

export class AwsClient extends InfraWalletClient {
  private readonly accounts: Map<string, string> = new Map();

  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new AwsClient(CLOUD_PROVIDER.AWS, config, database, cache, logger);
  }

  protected convertServiceName(serviceName: string): string {
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

    return `${this.provider}/${convertedName}`;
  }

  protected async initCloudClient(integrationConfig: Config): Promise<any> {
    const accountId = integrationConfig.getString('accountId');
    const assumedRoleName = integrationConfig.getOptionalString('assumedRoleName');
    const accessKeyId = integrationConfig.getOptionalString('accessKeyId');
    let secretAccessKey: string | undefined;
    const region = 'us-east-1';
    // Attempt to get the new, preferred key
    const newSecretAccessKey = integrationConfig.getOptionalString('secretAccessKey');
    // Attempt to get the old, deprecated key
    const oldAccessKeySecret = integrationConfig.getOptionalString('accessKeySecret');

    if (newSecretAccessKey) {
      // If the new key is present, use it
      secretAccessKey = newSecretAccessKey;
    } else if (oldAccessKeySecret) {
      // If the new key is NOT present, but the old one IS, use the old one and log a warning
      secretAccessKey = oldAccessKeySecret;
      this.logger.warn(`The 'accessKeySecret' configuration key is deprecated. Please rename it to 'secretAccessKey'.`);
    }

    if (!accessKeyId && !secretAccessKey && !assumedRoleName) {
      // No credentials provided in configuration, assuming credentials are available in the environment
      return new CostExplorerClient({ region: region });
    }

    let credentials = undefined;
    if (accessKeyId || secretAccessKey) {
      if (accessKeyId && secretAccessKey) {
        credentials = {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        };
      } else {
        throw new Error('Both accessKeyId and secretAccessKey must be provided');
      }
    }

    if (assumedRoleName === undefined) {
      return new CostExplorerClient({
        region: region,
        credentials: credentials,
      });
    }

    // Assume role
    const client = new STSClient({
      region: region,
      credentials: credentials,
    });
    const commandInput = {
      // AssumeRoleRequest
      RoleArn: `arn:aws:iam::${accountId}:role/${assumedRoleName}`,
      RoleSessionName: 'InfraWallet',
    };
    const assumeRoleCommand = new AssumeRoleCommand(commandInput);
    const assumeRoleResponse = await client.send(assumeRoleCommand);
    // init aws cost explorer client
    const awsCeClient = new CostExplorerClient({
      region: region,
      credentials: {
        accessKeyId: assumeRoleResponse.Credentials?.AccessKeyId as string,
        secretAccessKey: assumeRoleResponse.Credentials?.SecretAccessKey as string,
        sessionToken: assumeRoleResponse.Credentials?.SessionToken as string,
      },
    });

    return awsCeClient;
  }

  private async _fetchTags(client: any, query: TagsQuery, tagKey?: string): Promise<string[]> {
    const tags: string[] = [];
    let nextPageToken = undefined;

    do {
      const input: GetTagsCommandInput = {
        TimePeriod: {
          Start: moment(parseInt(query.startTime, 10)).format('YYYY-MM-DD'),
          End: moment(parseInt(query.endTime, 10)).format('YYYY-MM-DD'),
        },
        TagKey: tagKey,
      };
      const command = new GetTagsCommand(input);
      const response = await client.send(command);

      try {
        AWSGetTagsResponseSchema.parse(response);
        this.logger.debug(`AWS tags response validation passed`);
      } catch (error) {
        if (error instanceof ZodError) {
          this.logger.warn(`AWS tags response validation failed: ${error.message}`);
          this.logger.debug(`Sample validation errors: ${JSON.stringify(error.errors.slice(0, 3))}`);
        } else {
          this.logger.warn(`Unexpected validation error: ${error.message}`);
        }
      }

      for (const tag of response.Tags) {
        if (tag) {
          tags.push(tag);
        }
      }

      nextPageToken = response.NextPageToken;
    } while (nextPageToken);

    tags.sort((a, b) => a.localeCompare(b));
    return tags;
  }

  protected async fetchTagKeys(
    _integrationConfig: Config,
    client: any,
    query: TagsQuery,
  ): Promise<{ tagKeys: string[]; provider: CLOUD_PROVIDER }> {
    const tagKeys = await this._fetchTags(client, query);
    return { tagKeys: tagKeys, provider: this.provider };
  }

  protected async fetchTagValues(
    _integrationConfig: Config,
    client: any,
    query: TagsQuery,
    tagKey: string,
  ): Promise<{ tagValues: string[]; provider: CLOUD_PROVIDER }> {
    const tagValues = await this._fetchTags(client, query, tagKey);
    return { tagValues: tagValues, provider: this.provider };
  }

  protected async fetchCosts(_integrationConfig: Config, client: any, query: CostQuery): Promise<any> {
    // query this aws account's cost and usage using @aws-sdk/client-cost-explorer
    let costAndUsageResults: any[] = [];
    let nextPageToken = undefined;
    let filterExpression: Expression = { Dimensions: { Key: Dimension.RECORD_TYPE, Values: ['Usage'] } };
    const tags = parseTags(query.tags);
    if (tags.length) {
      let tagsExpression: Expression = {};

      if (tags.length === 1) {
        if (tags[0].value) {
          tagsExpression = { Tags: { Key: tags[0].key, Values: [tags[0].value] } };
        }
      } else {
        const tagList: Expression[] = [];
        for (const tag of tags) {
          if (tag.value) {
            tagList.push({ Tags: { Key: tag.key, Values: [tag.value] } });
          }
        }
        tagsExpression = { Or: tagList };
      }

      filterExpression = { And: [filterExpression, tagsExpression] };
    }

    do {
      const input: GetCostAndUsageCommandInput = {
        TimePeriod: {
          Start: moment(parseInt(query.startTime, 10)).format('YYYY-MM-DD'),
          End: moment(parseInt(query.endTime, 10)).format('YYYY-MM-DD'),
        },
        Granularity: query.granularity.toUpperCase() as Granularity,
        Filter: filterExpression,
        GroupBy: [
          { Type: GroupDefinitionType.DIMENSION, Key: Dimension.LINKED_ACCOUNT },
          { Type: GroupDefinitionType.DIMENSION, Key: Dimension.SERVICE },
        ],
        Metrics: ['UnblendedCost'],
        NextPageToken: nextPageToken,
      };

      const getCostCommand = new GetCostAndUsageCommand(input);
      const costAndUsageResponse = await client.send(getCostCommand);

      try {
        AWSGetCostAndUsageResponseSchema.parse(costAndUsageResponse);
        this.logger.debug(`AWS cost and usage response validation passed`);
      } catch (error) {
        if (error instanceof ZodError) {
          this.logger.warn(`AWS cost and usage response validation failed: ${error.message}`);
          this.logger.debug(`Sample validation errors: ${JSON.stringify(error.errors.slice(0, 3))}`);
        } else {
          this.logger.warn(`Unexpected validation error: ${error.message}`);
        }
      }

      // get AWS account names
      for (const accountAttributes of costAndUsageResponse.DimensionValueAttributes) {
        const accountId = accountAttributes.Value;
        const accountName = accountAttributes.Attributes.description;
        this.accounts.set(accountId, accountName);
      }

      costAndUsageResults = costAndUsageResults.concat(costAndUsageResponse.ResultsByTime);
      nextPageToken = costAndUsageResponse.NextPageToken;
    } while (nextPageToken);

    return costAndUsageResults;
  }

  protected async transformCostsData(
    integrationConfig: Config,
    query: CostQuery,
    costResponse: any,
  ): Promise<Report[]> {
    const categoryMappingService = CategoryMappingService.getInstance();
    const tags = integrationConfig.getOptionalStringArray('tags');
    const tagKeyValues: { [key: string]: string } = {};
    tags?.forEach(tag => {
      const [k, v] = tag.split(':');
      tagKeyValues[k.trim()] = v.trim();
    });

    // Initialize tracking variables
    let processedRecords = 0;
    let filteredOutZeroAmount = 0;
    let filteredOutMissingFields = 0;
    let filteredOutInvalidDate = 0;
    const filteredOutTimeRange = 0;
    const uniqueKeys = new Set<string>();
    const totalRecords = costResponse?.length || 0;

    const transformedData = reduce(
      costResponse,
      (accumulator: { [key: string]: Report }, row) => {
        const rowTime = row.TimePeriod?.Start;
        let period = 'unknown';

        // Check for invalid date
        if (!rowTime) {
          filteredOutInvalidDate++;
          return accumulator;
        }

        period = getBillingPeriod(query.granularity, rowTime, 'YYYY-MM-DD');

        if (row.Groups) {
          row.Groups.forEach((group: any) => {
            const accountId = group.Keys ? group.Keys[0] : '';
            const accountName = this.accounts.get(accountId) || accountId;
            const serviceName = group.Keys ? group.Keys[1] : '';
            const groupMetrics = group.Metrics;

            // Check for missing fields
            if (!accountId || !serviceName || !groupMetrics?.UnblendedCost?.Amount) {
              filteredOutMissingFields++;
              return;
            }

            const amount = parseCost(groupMetrics.UnblendedCost.Amount);

            // Check for zero amount
            if (amount === 0) {
              filteredOutZeroAmount++;
              return;
            }

            if (!this.evaluateIntegrationFilters(accountName, integrationConfig)) {
              return;
            }

            const keyName = `${accountId}_${serviceName}`;

            if (!accumulator[keyName]) {
              uniqueKeys.add(keyName);
              accumulator[keyName] = {
                id: keyName,
                account: `${this.provider}/${accountName} (${accountId})`,
                service: this.convertServiceName(serviceName),
                category: categoryMappingService.getCategoryByServiceName(this.provider, serviceName),
                provider: this.provider,
                providerType: PROVIDER_TYPE.INTEGRATION,
                reports: {},
                ...tagKeyValues,
              };
            }

            accumulator[keyName].reports[period] = amount;
            processedRecords++;
          });
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
}
