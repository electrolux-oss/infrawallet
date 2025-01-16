import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { CostQuery, Report } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';
import moment from 'moment';
import { CategoryMappingService } from '../service/CategoryMappingService';
import { CLOUD_PROVIDER, PROVIDER_TYPE } from '../service/consts';

export class ConfluentClient extends InfraWalletClient {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new ConfluentClient(CLOUD_PROVIDER.CONFLUENT, config, database, cache, logger);
  }

  protected convertServiceName(serviceName: string): string {
    let convertedName = serviceName;

    const prefixes = ['Confluent'];

    for (const prefix of prefixes) {
      if (serviceName.startsWith(prefix)) {
        convertedName = serviceName.slice(prefix.length).trim();
      }
    }

    return `${this.provider}/${convertedName}`;
  }

  private capitalizeWords(str: string): string {
    return str
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private async fetchEnvDisplayName(client: any, envId: string): Promise<string> {
    const url = `https://api.confluent.cloud/org/v2/environments/${envId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: client.headers,
    });

    if (!response.ok) {
      this.logger.warn(`Failed to fetch environment name for ${envId}: ${response.statusText}`);
      return envId
    }

    const jsonResponse = await response.json();
    return jsonResponse.display_name;
  }

  protected async initCloudClient(subAccountConfig: Config): Promise<any> {
    const apiKey = subAccountConfig.getString('apiKey');
    const apiSecret = subAccountConfig.getString('apiSecret');
    const auth = `${apiKey}:${apiSecret}`;

    const client = {
      headers: {
        Authorization: `Basic ${Buffer.from(auth).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    };

    return client;
  }

  protected async fetchCosts(_subAccountConfig: Config, client: any, query: CostQuery): Promise<any> {
    const startDate = moment(parseInt(query.startTime, 10));
    const endDate = moment(parseInt(query.endTime, 10));

    const currentStartDate = startDate.clone();
    let aggregatedData: any[] = [];

    try {
      while (currentStartDate.isBefore(endDate) || currentStartDate.isSame(endDate, 'month')) {
        const currentEndDate = moment.min(currentStartDate.clone().endOf('month'), endDate);

        const url = `https://api.confluent.cloud/billing/v1/costs?start_date=${currentStartDate.format(
          'YYYY-MM-DD',
        )}&end_date=${currentEndDate.add('1', 'd').format('YYYY-MM-DD')}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: client.headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch costs: ${response.statusText}`);
        }

        const jsonResponse: { data: any[] } = await response.json();

        const envIds = [...new Set(jsonResponse.data
          .map((item: any) => item.resource?.environment?.id)
          .filter((id: any) => id !== undefined))];

        const envNamePromises = envIds.map(envId => this.fetchEnvDisplayName(client, envId));
        const envNames = await Promise.all(envNamePromises);

        const envIdToName: { [envId: string]: string } = {};
        envIds.forEach((envId, index) => {
          envIdToName[envId] = envNames[index];
        });

        const dataWithEnvNames = jsonResponse.data
        .filter((item: any) => item.resource?.environment?.id)
        .map((item: any) => {
          const envId = item.resource.environment.id;
          return {
            ...item,
            envDisplayName: envIdToName[envId] || 'Unknown',
          };
        });

        aggregatedData = aggregatedData.concat(dataWithEnvNames);

        currentStartDate.add(1, 'month').startOf('month');
      }

      return {
        data: aggregatedData,
      };
    } catch (error) {
      this.logger.error(`Error fetching costs from Confluent: ${error.message}`);
      throw error;
    }
  }

  protected async transformCostsData(subAccountConfig: Config, query: CostQuery, costResponse: any): Promise<Report[]> {
    const categoryMappingService = CategoryMappingService.getInstance();
    const accountName = subAccountConfig.getString('name');
    const tags = subAccountConfig.getOptionalStringArray('tags');
    const tagKeyValues: { [key: string]: string } = {};
    tags?.forEach(tag => {
      const [k, v] = tag.split(':');
      tagKeyValues[k.trim()] = v.trim();
    });

    const transformedData = costResponse.data.reduce((accumulator: { [key: string]: Report }, line: any) => {
      const amount = parseFloat(line.amount) || 0;

      if (amount === 0) {
        return accumulator;
      }

      const parsedStartDate = moment(line.start_date);

      if (!parsedStartDate.isValid()) {
        return accumulator;
      }

      let billingPeriod = undefined;
      if (query.granularity.toUpperCase() === 'MONTHLY') {
        billingPeriod = parsedStartDate.format('YYYY-MM');
      } else {
        billingPeriod = parsedStartDate.format('YYYY-MM-DD');
      }

      const serviceName = this.capitalizeWords(line.line_type);
      const resourceName = line.resource.display_name || 'Unknown';
      const envDisplayName = line.envDisplayName;

      const keyName = `${accountName}->${categoryMappingService.getCategoryByServiceName(
        this.provider,
        serviceName,
      )}->${resourceName}`;

      if (!accumulator[keyName]) {
        accumulator[keyName] = {
          id: keyName,
          account: `${this.provider}/${accountName}`,
          service: this.convertServiceName(serviceName),
          category: categoryMappingService.getCategoryByServiceName(this.provider, serviceName),
          provider: this.provider,
          providerType: PROVIDER_TYPE.INTEGRATION,
          reports: {},
          ...{ project: envDisplayName },
          ...{ cluster: resourceName },
          ...tagKeyValues,
        };
      }

      if (!moment(billingPeriod).isBefore(moment(parseInt(query.startTime, 10)))) {
        accumulator[keyName].reports[billingPeriod] = (accumulator[keyName].reports[billingPeriod] || 0) + amount;
      }

      return accumulator;
    }, {});

    return Object.values(transformedData);
  }
}
