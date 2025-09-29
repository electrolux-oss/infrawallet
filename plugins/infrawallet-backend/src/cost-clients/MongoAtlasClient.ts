import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { reduce } from 'lodash';
import moment from 'moment';
import urllib from 'urllib';
import { CategoryMappingService } from '../service/CategoryMappingService';
import { CLOUD_PROVIDER, PROVIDER_TYPE } from '../service/consts';
import { getBillingPeriod } from '../service/functions';
import { CostQuery, Report } from '../service/types';
import { InfraWalletClient } from './InfraWalletClient';
import { MongoAtlasInvoicesResponseSchema } from '../schemas/MongoAtlasBilling';
import { ZodError } from 'zod';

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

      try {
        MongoAtlasInvoicesResponseSchema.parse(response.data);
        this.logger.debug(`MongoDB Atlas invoices response validation passed`);
      } catch (error) {
        if (error instanceof ZodError) {
          this.logger.warn(`MongoDB Atlas invoices response validation failed: ${error.message}`);
          this.logger.debug(`Sample validation errors: ${JSON.stringify(error.errors.slice(0, 3))}`);
        } else {
          this.logger.warn(`Unexpected validation error: ${error.message}`);
        }
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
    const rows = lines.slice(1).filter(line => line.trim());

    // Initialize tracking variables
    let processedRecords = 0;
    let filteredOutZeroAmount = 0;
    let filteredOutMissingFields = 0;
    let filteredOutInvalidDate = 0;
    let filteredOutTimeRange = 0;
    const uniqueKeys = new Set<string>();
    const totalRecords = rows.length;

    const transformedData = reduce(
      rows,
      (accumulator: { [key: string]: Report }, line) => {
        const columns = line.split(',');
        const rowData: { [key: string]: string } = {};
        header.forEach((columnName, index) => {
          rowData[columnName] = columns[index];
        });

        // Check for missing fields
        if (!rowData.Amount || !rowData.Date || !rowData.SKU) {
          filteredOutMissingFields++;
          return accumulator;
        }

        const amount = parseFloat(rowData.Amount) || 0;

        // Check for zero amount
        if (amount === 0) {
          filteredOutZeroAmount++;
          return accumulator;
        }

        try {
          const billingPeriod = getBillingPeriod(query.granularity, rowData.Date, 'MM/DD/YYYY');
          const serviceName = rowData.SKU;
          const cluster = rowData.Cluster || 'Unknown';
          const project = rowData.Project || 'Unknown';

          const keyName = `${accountName}->${categoryMappingService.getCategoryByServiceName(
            this.provider,
            serviceName,
          )}->${project}->${cluster}`;

          if (!accumulator[keyName]) {
            uniqueKeys.add(keyName);
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
            processedRecords++;
          } else {
            filteredOutTimeRange++;
          }
        } catch (error) {
          filteredOutInvalidDate++;
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
