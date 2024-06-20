import { CostManagementClient, QueryDefinition } from '@azure/arm-costmanagement';
import { ClientSecretCredential } from '@azure/identity';
import { createHttpHeaders, createPipelineRequest } from "@azure/core-rest-pipeline";
import { LoggerService, DatabaseService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { reduce } from 'lodash';
import moment from 'moment';
import { InfraWalletApi } from './InfraWalletApi';
import { CostQuery, Report } from './types';
import { getCategoryMappings, getCategoryByServiceName } from './functions';

export class AzureClient implements InfraWalletApi {
  static create(config: Config, database: DatabaseService, logger: LoggerService) {
    return new AzureClient(config, database, logger);
  }

  constructor(
    private readonly config: Config,
    private readonly database: DatabaseService,
    private readonly logger: LoggerService,
  ) {
  }

  convertServiceName(serviceName: string): string {
    let convertedName = serviceName;

    const prefixes = ['Azure'];

    for (const prefix of prefixes) {
      if (serviceName.startsWith(prefix)) {
        convertedName = serviceName.slice(prefix.length).trim();
      }
    }

    return `Azure/${convertedName}`;
  }

  formatDate(dateNumber: number): string | null {
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

  async fetchDataWithRetry(
    client: CostManagementClient,
    url: string,
    body: any,
    maxRetries = 5
  ): Promise<any> {
    let retries = 0;

    while (retries < maxRetries) {
      const request = createPipelineRequest({
        url: url,
        method: "POST",
        body: JSON.stringify(body),
        headers: createHttpHeaders({
          "Content-Type": "application/json"
        }),
      });
      const response = await client.pipeline.sendRequest(client, request);
      if (response.status === 200) {
        return JSON.parse(response.bodyAsText || '{}');
      }
      else if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("x-ms-ratelimit-microsoft.costmanagement-entity-retry-after")!);
        this.logger.warn(`Hit Azure rate limit, retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        retries++;
      } else {
        throw new Error(response.bodyAsText as string);
      }
    }

    throw new Error('Max retries exceeded');
  }

  async queryAzureCostExplorer(
    azureClient: CostManagementClient,
    subscription: string,
    granularity: string,
    groups: { type: string; name: string }[],
    startDate: moment.Moment,
    endDate: moment.Moment,
  ) {
    // Azure SDK doesn't support pagination, so sending HTTP request directly
    const url = `https://management.azure.com/subscriptions/${subscription}/providers/Microsoft.CostManagement/query?api-version=2022-10-01`;

    const query: QueryDefinition = {
      type: 'ActualCost',
      dataset: {
        granularity: granularity,
        aggregation: { totalCostUSD: { name: 'CostUSD', function: 'Sum' } },
        grouping: groups,
      },
      timeframe: 'Custom',
      timePeriod: {
        from: startDate.toDate(),
        to: endDate.toDate(),
      },
    };

    let result = await this.fetchDataWithRetry(azureClient, url, query);
    let allResults = result.properties.rows;

    while (result.properties.nextLink) {
      result = await this.fetchDataWithRetry(azureClient, result.properties.nextLink, query);
      allResults = allResults.concat(result.properties.rows);
    }

    return allResults;
  }

  async fetchCostsFromCloud(query: CostQuery): Promise<Report[]> {
    const conf = this.config.getOptionalConfigArray(
      'backend.infraWallet.integrations.azure',
    );
    if (!conf) {
      return [];
    }

    const categoryMappings = await getCategoryMappings(
      this.database,
      'azure',
    );

    const promises = [];
    const results: Report[] = [];

    const groupPairs = [{ type: 'Dimension', name: 'ServiceName' }];
    for (const c of conf) {
      const name = c.getString('name');
      const subscriptionId = c.getString('subscriptionId');
      const tenantId = c.getString('tenantId');
      const clientId = c.getString('clientId');
      const clientSecret = c.getString('clientSecret');
      const credential = new ClientSecretCredential(
        tenantId as string,
        clientId as string,
        clientSecret as string,
      );
      const client = new CostManagementClient(credential);
      const tags = c.getOptionalStringArray('tags');
      const tagKeyValues: { [key: string]: string } = {};
      tags?.forEach(tag => {
        const [k, v] = tag.split(':');
        tagKeyValues[k.trim()] = v.trim();
      });

      const promise = (async () => {
        try {
          const costResponse = await this.queryAzureCostExplorer(
            client,
            subscriptionId as string,
            query.granularity,
            groupPairs,
            moment(parseInt(query.startTime, 10)),
            moment(parseInt(query.endTime, 10)),
          );

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

              let keyName = name;
              for (let i = 0; i < groupPairs.length; i++) {
                keyName += `->${row[i + 2]}`;
              }

              if (!accumulator[keyName]) {
                accumulator[keyName] = {
                  id: keyName,
                  name: `Azure/${name}`,
                  service: this.convertServiceName(serviceName),
                  category: getCategoryByServiceName(serviceName, categoryMappings),
                  provider: 'Azure',
                  reports: {},
                  ...tagKeyValues,
                };
              }

              if (
                !moment(date).isBefore(moment(parseInt(query.startTime, 10)))
              ) {
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

          Object.values(transformedData).map((value: Report) => {
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
