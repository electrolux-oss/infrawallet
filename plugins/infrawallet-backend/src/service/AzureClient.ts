import { CostManagementClient } from '@azure/arm-costmanagement';
import { ClientSecretCredential } from '@azure/identity';
import { DatabaseService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { reduce } from 'lodash';
import moment from 'moment';
import { CostQuery, InfraWalletApi, Report } from './InfraWalletApi';
import { getCategoryMappings, getCategoryByServiceName } from './functions';

export class AzureClient implements InfraWalletApi {
  static create(config: Config, database: DatabaseService) {
    return new AzureClient(config, database);
  }

  constructor(
    private readonly config: Config,
    private readonly database: DatabaseService,
  ) {}

  async queryAzureCostExplorer(
    azureClient: any,
    subscription: string,
    granularity: string,
    groups: { type: string; name: string }[],
    startDate: moment.Moment,
    endDate: moment.Moment,
  ) {
    const scope = `/subscriptions/${subscription}`;

    const query = {
      type: 'ActualCost',
      dataset: {
        granularity: granularity,
        aggregation: { totalCostUSD: { name: 'CostUSD', function: 'Sum' } },
        grouping: groups,
      },
      timeframe: 'Custom',
      timePeriod: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
    };

    const result = await azureClient.query.usage(scope, query);
    return result;
  }

  async fetchCostsFromCloud(query: CostQuery): Promise<Report[]> {
    const conf = this.config.getOptionalConfigArray(
      'backend.infraWallet.integrations.azure',
    );
    if (!conf) {
      return [];
    }

    const promises = [];
    const results = [];

    const groupPairs = [{ type: 'Dimension', name: 'ServiceName' }];
    for (const c of conf) {
      const name = c.getOptionalString('name');
      const subscriptionId = c.getOptionalString('subscriptionId');
      const tenantId = c.getOptionalString('tenantId');
      const clientId = c.getOptionalString('clientId');
      const clientSecret = c.getOptionalString('clientSecret');
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
      const categoryMappings = await getCategoryMappings(
        this.database,
        'azure',
      );

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

          const transformedData = reduce(
            costResponse.rows,
            (acc, row) => {
              let keyName = name;
              for (let i = 0; i < groupPairs.length; i++) {
                keyName += `->${row[i + 2]}`;
              }

              if (!acc[keyName]) {
                acc[keyName] = {
                  id: keyName,
                  name: name,
                  service: `${row[2]} (Azure)`,
                  category: getCategoryByServiceName(row[2], categoryMappings),
                  provider: 'Azure',
                  reports: {},
                  ...tagKeyValues,
                };
              }

              if (
                !moment(row[1]).isBefore(moment(parseInt(query.startTime, 10)))
              ) {
                acc[keyName].reports[row[1].substring(0, 7)] = parseFloat(
                  row[0],
                );
              }
              return acc;
            },
            {},
          );

          Object.values(transformedData).map((value: any) => {
            results.push(value);
          });
        } catch (e) {
          throw new Error(e.message);
        }
      })();
      promises.push(promise);
    }
    await Promise.all(promises);
    return results;
  }
}
