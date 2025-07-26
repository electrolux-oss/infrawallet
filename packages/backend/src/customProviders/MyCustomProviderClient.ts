import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import {
  InfraWalletClient,
  CLOUD_PROVIDER,
  GRANULARITY,
  PROVIDER_TYPE,
  CostQuery,
  Report,
  TagsQuery,
  TagsResponse,
  CloudProviderError,
  ClientResponse,
  Wallet,
} from '@electrolux-oss/plugin-infrawallet-node';

/**
 * Example custom cost client implementation
 *
 * This demonstrates how to implement a cost client for a fictional
 * cloud provider called "MyCustomProvider"
 */
export class MyCustomProviderClient extends InfraWalletClient {
  constructor(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    // Use CUSTOM provider type for our custom provider
    super(CLOUD_PROVIDER.CUSTOM, config, database, cache, logger);
  }

  /**
   * Initialize the client for a specific integration configuration
   */
  protected async initCloudClient(integrationConfig: Config): Promise<any> {
    // For demo purposes, just return the integration name
    const name = integrationConfig.getString('name');

    return {
      name,
    };
  }

  /**
   * Fetch cost data from the provider's API (mock implementation)
   */
  protected async fetchCosts(_integrationConfig: Config, client: any, query: CostQuery): Promise<any> {
    const { name } = client;

    // Generate mock cost data
    const startDate = new Date(parseInt(query.startTime, 10));
    const endDate = new Date(parseInt(query.endTime, 10));

    // Generate some realistic mock data
    const mockData = {
      items: [
        {
          accountId: 'custom-001',
          accountName: name,
          service: 'Compute Service',
          category: 'Compute',
          costs: this.generateMockCostData(startDate, endDate, query.granularity, 150.5),
        },
        {
          accountId: 'custom-001',
          accountName: name,
          service: 'Storage Service',
          category: 'Storage',
          costs: this.generateMockCostData(startDate, endDate, query.granularity, 75.25),
        },
        {
          accountId: 'custom-001',
          accountName: name,
          service: 'Network Service',
          category: 'Network',
          costs: this.generateMockCostData(startDate, endDate, query.granularity, 25.0),
        },
      ],
    };

    return mockData;
  }

  /**
   * Transform the provider's cost data format into InfraWallet's Report format
   */
  protected async transformCostsData(
    _integrationConfig: Config,
    query: CostQuery,
    costResponse: any,
  ): Promise<Report[]> {
    const reports: Report[] = [];

    // Transform the provider's response format to InfraWallet format
    // This is a simplified example - adjust based on your provider's actual response
    for (const item of costResponse.items || []) {
      const report: Report = {
        id: `${item.accountId}_${item.service}`,
        account: `${this.provider}/${item.accountName} (${item.accountId})`,
        service: `${this.provider}/${item.service}`,
        category: item.category || 'Compute',
        provider: this.provider,
        providerType: PROVIDER_TYPE.INTEGRATION,
        reports: {},
      };

      // Add cost data for each period
      for (const period of item.costs || []) {
        const periodKey = this.formatPeriod(period.date, query.granularity);
        report.reports[periodKey] = period.amount;
      }

      reports.push(report);
    }

    return reports;
  }

  /**
   * Get available tag keys from the provider
   */
  async getTagKeys(_query: TagsQuery): Promise<TagsResponse> {
    try {
      // For this example, return some hardcoded tag keys
      // In a real implementation, you would fetch these from the provider's API
      return {
        tags: [
          { key: 'Environment', provider: this.provider },
          { key: 'Project', provider: this.provider },
          { key: 'Department', provider: this.provider },
        ],
        errors: [],
      };
    } catch (error: any) {
      return {
        tags: [],
        errors: [
          {
            provider: this.provider,
            name: this.provider,
            error: error.message,
          },
        ],
      };
    }
  }

  /**
   * Get tag values for a specific tag key
   */
  async getTagValues(_query: TagsQuery, tagKey: string): Promise<TagsResponse> {
    try {
      // Example hardcoded values - fetch from API in real implementation
      const tagValues: { [key: string]: string[] } = {
        Environment: ['production', 'staging', 'development'],
        Project: ['project-a', 'project-b', 'project-c'],
        Department: ['engineering', 'marketing', 'sales'],
      };

      const values = tagValues[tagKey] || [];

      return {
        tags: values.map(value => ({
          key: tagKey,
          value: value,
          provider: this.provider,
        })),
        errors: [],
      };
    } catch (error: any) {
      return {
        tags: [],
        errors: [
          {
            provider: this.provider,
            name: this.provider,
            error: error.message,
          },
        ],
      };
    }
  }

  /**
   * Main method to get cost reports
   */
  async getCostReports(query: CostQuery): Promise<ClientResponse> {
    const integrationConfigs = this.config.getOptionalConfigArray(`backend.infraWallet.integrations.mycustomprovider`);

    if (!integrationConfigs || integrationConfigs.length === 0) {
      return { reports: [], errors: [] };
    }

    const reports: Report[] = [];
    const errors: CloudProviderError[] = [];

    for (const integrationConfig of integrationConfigs) {
      try {
        const client = await this.initCloudClient(integrationConfig);
        const costData = await this.fetchCosts(integrationConfig, client, query);
        const transformedReports = await this.transformCostsData(integrationConfig, query, costData);

        reports.push(...transformedReports);
      } catch (error: any) {
        this.logger.error(`Failed to fetch costs from MyCustomProvider: ${error.message}`);
        errors.push({
          provider: this.provider,
          name: integrationConfig.getString('name'),
          error: error.message,
        });
      }
    }

    return { reports, errors };
  }

  /**
   * Save cost reports to the database for scheduled fetching
   */
  async saveCostReportsToDatabase(wallet: Wallet, granularity: GRANULARITY): Promise<void> {
    // This would typically fetch and save historical cost data
    // For this example, we'll just log
    this.logger.info(`Saving ${granularity} cost data for MyCustomProvider to wallet ${wallet.name}`);

    // In a real implementation:
    // 1. Determine the time range to fetch
    // 2. Call getCostReports with that range
    // 3. Save the results to the database using the models from InfraWallet
  }

  /**
   * Helper method to format dates according to granularity
   */
  private formatPeriod(date: string, granularity: string): string {
    const d = new Date(date);
    if (granularity === 'daily') {
      return d.toISOString().split('T')[0];
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Generate mock cost data for a date range
   */
  private generateMockCostData(startDate: Date, endDate: Date, granularity: string, baseCost: number): any[] {
    const costs = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      // Add some randomness to the cost (±20%)
      const randomFactor = 0.8 + Math.random() * 0.4;
      const cost = Math.round(baseCost * randomFactor * 100) / 100;

      costs.push({
        date: current.toISOString(),
        amount: cost,
      });

      // Increment based on granularity
      if (granularity === 'daily') {
        current.setDate(current.getDate() + 1);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }

    return costs;
  }
}
