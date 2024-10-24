import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { reduce } from 'lodash';
import moment from 'moment';
import urllib from 'urllib';
import { CategoryMappingService } from '../service/CategoryMappingService';
import { CLOUD_PROVIDER, PROVIDER_TYPE } from '../service/consts';
import { CostQuery, Report } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';

export class MongoAtlasClient extends InfraWalletClient {
  static create(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    return new MongoAtlasClient(CLOUD_PROVIDER.MONGODB_ATLAS, config, database, cache, logger);
  }

  protected convertServiceName(serviceName: string): string {
    let convertedName = serviceName;

    const prefixes = ['Atlas'];

    for (const prefix of prefixes) {
      if (serviceName.startsWith(prefix)) {
        convertedName = serviceName.slice(prefix.length).trim();
      }
    }

    return `${this.provider}/${convertedName}`;
  }

  protected async initCloudClient(subAccountConfig: any): Promise<any> {
    const publicKey = subAccountConfig.getString('publicKey');
    const privateKey = subAccountConfig.getString('privateKey');

    const client = {
      digestAuth: `${publicKey}:${privateKey}`,
    };

    return client;
  }

  protected async fetchCosts(subAccountConfig: Config, client: any, query: CostQuery): Promise<any> {
    const orgId = subAccountConfig.getString('orgId');
    const invoicesUrl = `/orgs/${orgId}/invoices?fromDate=${moment(parseInt(query.startTime, 10)).format(
      'YYYY-MM-DD',
    )}&toDate=${moment(parseInt(query.endTime, 10)).add(1, 'M').format('YYYY-MM-DD')}`;

    try {
      const fullInvoicesUrl = `https://cloud.mongodb.com/api/atlas/v2${invoicesUrl}`;
      const response = await urllib.request(fullInvoicesUrl, {
        ...client,
        method: 'GET',
        dataType: 'json',
        headers: {
          Accept: 'application/vnd.atlas.2023-01-01+json',
        },
      });

      if (response.status !== 200) {
        throw new Error(`Error fetching invoices: ${response.status} ${response.statusText}`);
      }

      const invoices = response.data.results;

      const allInvoicesData = await Promise.all(
        invoices.map(async (invoice: any) => {
          const invoiceId = invoice.id;
          const csvUrl = `/orgs/${orgId}/invoices/${invoiceId}/csv`;
          const fullCsvUrl = `https://cloud.mongodb.com/api/atlas/v2${csvUrl}`;
          const csvResponse = await urllib.request(fullCsvUrl, {
            ...client,
            method: 'GET',
            dataType: 'text',
            headers: {
              Accept: 'application/vnd.atlas.2023-01-01+csv',
            },
          });

          if (csvResponse.status !== 200) {
            throw new Error(`Error fetching invoice CSV: ${csvResponse.status} ${csvResponse.statusText}`);
          }

          const lines = csvResponse.data.split('\n');

          let foundOrganizationIdLine = false;

          // Discard rows from the beginning of the CSV up to and including the row starting with "Organization ID"
          const filteredLines = lines
            .filter((line: string) => {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('Organization ID,')) {
                foundOrganizationIdLine = true;
                return false;
              }
              if (!foundOrganizationIdLine) {
                return false;
              }
              return trimmedLine !== '' && !trimmedLine.includes('Credit'); // Discard empty lines and lines where SKU is 'Credit'
            })
            .join('\n');

          return filteredLines;
        }),
      );

      return allInvoicesData.join('\n');
    } catch (error) {
      this.logger.error(`Error fetching invoices from MongoDB Atlas: ${error.message}`);
      throw error;
    }
  }

  protected async transformCostsData(
    subAccountConfig: Config,
    query: CostQuery,
    costResponse: string,
  ): Promise<Report[]> {
    const categoryMappingService = CategoryMappingService.getInstance();
    const accountName = subAccountConfig.getString('name');
    const tags = subAccountConfig.getOptionalStringArray('tags');
    const tagKeyValues: { [key: string]: string } = {};
    tags?.forEach(tag => {
      const [k, v] = tag.split(':');
      tagKeyValues[k.trim()] = v.trim();
    });

    const lines = costResponse.split('\n');
    const header = lines[0].split(',');
    const rows = lines.slice(1);

    const transformedData = reduce(
      rows,
      (accumulator: { [key: string]: Report }, line) => {
        const columns = line.split(',');
        const rowData: { [key: string]: string } = {};
        header.forEach((columnName, index) => {
          rowData[columnName] = columns[index];
        });

        const amount = parseFloat(rowData.Amount) || 0;

        const dateFormat = 'MM/DD/YYYY';
        const date = rowData.Date;
        const parsedDate = moment(date, dateFormat, true);

        if (!parsedDate.isValid()) {
          return accumulator;
        }

        let billingPeriod = undefined;
        if (query.granularity.toUpperCase() === 'MONTHLY') {
          billingPeriod = parsedDate.format('YYYY-MM');
        } else {
          billingPeriod = parsedDate.format('YYYY-MM-DD');
        }

        const serviceName = rowData.SKU;
        const cluster = rowData.Cluster || 'Unknown';
        const project = rowData.Project || 'Unknown';

        const keyName = `${accountName}->${categoryMappingService.getCategoryByServiceName(
          this.provider,
          serviceName,
        )}->${project}->${cluster}`;

        if (!accumulator[keyName]) {
          accumulator[keyName] = {
            id: keyName,
            account: `${this.provider}/${accountName}`,
            service: this.convertServiceName(serviceName),
            category: categoryMappingService.getCategoryByServiceName(this.provider, serviceName),
            provider: this.provider,
            providerType: PROVIDER_TYPE.INTEGRATION,
            reports: {},
            ...{ project: project },
            ...{ cluster: cluster },
            ...tagKeyValues,
          };
        }

        if (!moment(billingPeriod).isBefore(moment(parseInt(query.startTime, 10)))) {
          accumulator[keyName].reports[billingPeriod] = (accumulator[keyName].reports[billingPeriod] || 0) + amount;
        }

        return accumulator;
      },
      {},
    );

    return Object.values(transformedData);
  }
}
