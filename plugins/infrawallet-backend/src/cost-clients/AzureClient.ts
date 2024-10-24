import { CostManagementClient, QueryDefinition, QueryFilter } from '@azure/arm-costmanagement';
import { createHttpHeaders, createPipelineRequest } from '@azure/core-rest-pipeline';
import { ClientSecretCredential } from '@azure/identity';
import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { reduce } from 'lodash';
import moment from 'moment';
import { CategoryMappingService } from '../service/CategoryMappingService';
import { CLOUD_PROVIDER, PROVIDER_TYPE } from '../service/consts';
import { parseTags } from '../service/functions';
import { CostQuery, Report, TagsQuery } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';

export class AzureClient extends InfraWalletClient {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new AzureClient(CLOUD_PROVIDER.AZURE, config, database, cache, logger);
  }

  protected convertServiceName(serviceName: string): string {
    let convertedName = serviceName;

    const prefixes = ['Azure'];

    for (const prefix of prefixes) {
      if (serviceName.startsWith(prefix)) {
        convertedName = serviceName.slice(prefix.length).trim();
      }
    }

    return `${this.provider}/${convertedName}`;
  }

  private formatDate(dateNumber: number): string | null {
    // dateNumber example: 20240407
    const dateString = dateNumber.toString();

    if (dateString.length !== 8) {
      return null;
    }

    const year = dateString.slice(0, 4);
    const month = dateString.slice(4, 6);
    const day = dateString.slice(6);

    return `${year}-${month}-${day}`;
  }

  private async fetchDataWithRetry(client: CostManagementClient, url: string, body: any, maxRetries = 5): Promise<any> {
    let retries = 0;

    while (retries < maxRetries) {
      const request = createPipelineRequest({
        url: url,
        method: 'POST',
        body: JSON.stringify(body),
        headers: createHttpHeaders({
          'Content-Type': 'application/json',
          ClientType: 'InfraWallet',
        }),
      });
      const response = await client.pipeline.sendRequest(client, request);
      if (response.status === 200) {
        return JSON.parse(response.bodyAsText || '{}');
      } else if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get('x-ms-ratelimit-microsoft.costmanagement-entity-retry-after') || '60',
          10,
        );
        this.logger.warn(`Hit Azure rate limit, retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        retries++;
      } else {
        throw new Error(response.bodyAsText as string);
      }
    }

    throw new Error('Max retries exceeded');
  }

  // If tagKey is specified, returns all tag values of that key.
  // Otherwise returns all available tag keys.
  private async _fetchTags(subAccountConfig: Config, client: any, query: TagsQuery, tagKey: string): Promise<string[]> {
    const subscriptionId = subAccountConfig.getString('subscriptionId');
    const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2021-10-01`;

    const queryDefinition: QueryDefinition = {
      type: 'ActualCost',
      dataset: {
        granularity: 'None',
        grouping: [{ type: 'TagKey', name: tagKey }],
      },
      timeframe: 'Custom',
      timePeriod: {
        from: moment(parseInt(query.startTime, 10)).toDate(),
        to: moment(parseInt(query.endTime, 10)).toDate(),
      },
    };

    let result = await this.fetchDataWithRetry(client, url, queryDefinition);
    let allResults = result.properties.rows;

    while (result.properties.nextLink) {
      result = await this.fetchDataWithRetry(client, result.properties.nextLink, queryDefinition);
      allResults = allResults.concat(result.properties.rows);
    }

    const tags: string[] = [];
    for (const row of allResults) {
      if (tagKey === '') {
        if (row[0] && !row[0].startsWith('hidden-')) {
          tags.push(row[0]);
        }
      } else if (row[1]) {
        tags.push(row[1]);
      }
    }
    tags.sort((a, b) => a.localeCompare(b));

    return tags;
  }

  protected async initCloudClient(config: Config): Promise<any> {
    const tenantId = config.getString('tenantId');
    const clientId = config.getString('clientId');
    const clientSecret = config.getString('clientSecret');
    const credential = new ClientSecretCredential(tenantId as string, clientId as string, clientSecret as string);
    const client = new CostManagementClient(credential);

    return client;
  }

  protected async fetchTagKeys(
    subAccountConfig: Config,
    client: any,
    query: TagsQuery,
  ): Promise<{ tagKeys: string[]; provider: CLOUD_PROVIDER }> {
    const tagKeys = await this._fetchTags(subAccountConfig, client, query, '');
    return { tagKeys: tagKeys, provider: this.provider };
  }

  protected async fetchTagValues(
    subAccountConfig: Config,
    client: any,
    query: TagsQuery,
    tagKey: string,
  ): Promise<{ tagValues: string[]; provider: CLOUD_PROVIDER }> {
    const tagValues = await this._fetchTags(subAccountConfig, client, query, tagKey);
    return { tagValues: tagValues, provider: this.provider };
  }

  protected async fetchCosts(subAccountConfig: Config, client: any, query: CostQuery): Promise<any> {
    // Azure SDK doesn't support pagination, so sending HTTP request directly
    const subscriptionId = subAccountConfig.getString('subscriptionId');
    const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`;

    const groupPairs = [{ type: 'Dimension', name: 'ServiceName' }];
    let filter: QueryFilter | undefined = undefined;
    const tags = parseTags(query.tags);
    if (tags.length) {
      if (tags.length === 1) {
        if (tags[0].value) {
          filter = {
            tags: { name: tags[0].key, operator: 'In', values: [tags[0].value] },
          };
        }
      } else {
        const tagList: QueryFilter[] = [];
        for (const tag of tags) {
          if (tag.value) {
            tagList.push({ tags: { name: tag.key, operator: 'In', values: [tag.value] } });
          }
        }
        filter = { or: tagList };
      }
    }

    const queryDefinition: QueryDefinition = {
      type: 'ActualCost',
      dataset: {
        granularity: query.granularity,
        aggregation: { totalCostUSD: { name: 'CostUSD', function: 'Sum' } },
        grouping: groupPairs,
        filter: filter,
      },
      timeframe: 'Custom',
      timePeriod: {
        from: moment(parseInt(query.startTime, 10)).toDate(),
        to: moment(parseInt(query.endTime, 10)).toDate(),
      },
    };

    let result = await this.fetchDataWithRetry(client, url, queryDefinition);
    let allResults = result.properties.rows;

    while (result.properties.nextLink) {
      result = await this.fetchDataWithRetry(client, result.properties.nextLink, queryDefinition);
      allResults = allResults.concat(result.properties.rows);
    }

    return allResults;
  }

  protected async transformCostsData(subAccountConfig: Config, query: CostQuery, costResponse: any): Promise<Report[]> {
    /*
      Monthly cost sample:
        [
          123.456,
          "2024-04-07T00:00:00",  // BillingMonth
          "Azure App Service",
          "EUR"
        ]

      Daily cost sample:
        [
          12.3456,
          20240407,  // UsageDate
          "Azure App Service",
          "EUR"
        ]
    */
    const categoryMappingService = CategoryMappingService.getInstance();
    const accountName = subAccountConfig.getString('name');
    const subscriptionId = subAccountConfig.getString('subscriptionId');
    const groupPairs = [{ type: 'Dimension', name: 'ServiceName' }];
    const tags = subAccountConfig.getOptionalStringArray('tags');
    const tagKeyValues: { [key: string]: string } = {};
    tags?.forEach(tag => {
      const [k, v] = tag.split(':');
      tagKeyValues[k.trim()] = v.trim();
    });
    const transformedData = reduce(
      costResponse,
      (accumulator: { [key: string]: Report }, row) => {
        const cost = row[0];
        let date = row[1];
        const serviceName = row[2];

        if (query.granularity.toUpperCase() === 'DAILY') {
          // 20240407 -> "2024-04-07"
          date = this.formatDate(date);
        }

        let keyName = accountName;
        for (let i = 0; i < groupPairs.length; i++) {
          keyName += `->${row[i + 2]}`;
        }

        if (!accumulator[keyName]) {
          accumulator[keyName] = {
            id: keyName,
            account: `${this.provider}/${accountName} (${subscriptionId})`,
            service: this.convertServiceName(serviceName),
            category: categoryMappingService.getCategoryByServiceName(this.provider, serviceName),
            provider: this.provider,
            providerType: PROVIDER_TYPE.INTEGRATION,
            reports: {},
            ...tagKeyValues,
          };
        }

        if (!moment(date).isBefore(moment(parseInt(query.startTime, 10)))) {
          if (query.granularity.toUpperCase() === 'MONTHLY') {
            const yearMonth = date.substring(0, 7);
            accumulator[keyName].reports[yearMonth] = parseFloat(cost);
          } else {
            accumulator[keyName].reports[date] = parseFloat(cost);
          }
        }
        return accumulator;
      },
      {},
    );

    return Object.values(transformedData);
  }
}
