# :material-api: Custom Providers

InfraWallet provides an extension point system that allows you to integrate custom cloud providers or cost management systems beyond the built-in integrations. This enables you to add support for proprietary systems, internal platforms, or any service that provides cost data.

## Overview

Custom cost clients extend InfraWallet's functionality by implementing the `InfraWalletClient` abstract class and registering with the cost clients extension point. This approach allows you to:

- Add support for any cost management system
- Transform external cost data into InfraWallet's format
- Integrate with internal billing systems
- Create mock providers for testing

## Implementation Methods

There are two ways to implement custom cost clients:

### Method 1: Direct Integration in Backend

For simple integrations or when you want to keep everything in one place, you can add your custom provider directly to the backend package.

1. Create a directory for your custom providers in the backend:

   ```
   packages/backend/src/customProviders/
   ```

2. Implement your cost client by extending `InfraWalletClient`:

```typescript
import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import {
  InfraWalletClient,
  CLOUD_PROVIDER,
  CostQuery,
  Report,
  TagsQuery,
  TagsResponse,
  ClientResponse,
  PROVIDER_TYPE,
} from '@electrolux-oss/plugin-infrawallet-node';

export class MyCustomProviderClient extends InfraWalletClient {
  constructor(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    // Use CLOUD_PROVIDER.CUSTOM for custom providers
    super(CLOUD_PROVIDER.CUSTOM, config, database, cache, logger);
  }

  // Implement required abstract methods...
}
```

3. Register your provider in `packages/backend/src/index.ts`:

```typescript
import { createBackendModule } from '@backstage/backend-plugin-api';
import { infraWalletCostClientsExtensionPoint } from '@electrolux-oss/plugin-infrawallet-node';
import { MyCustomProviderClient } from './customProviders/MyCustomProviderClient';

// Create inline module for custom provider
const customProviderModule = createBackendModule({
  pluginId: 'infrawallet',
  moduleId: 'custom-provider',
  register(env) {
    env.registerInit({
      deps: {
        costClients: infraWalletCostClientsExtensionPoint,
      },
      async init({ costClients }) {
        costClients.registerCostClient({
          provider: 'mycustomprovider',
          factory: (config, database, cache, logger) => 
            new MyCustomProviderClient(config, database, cache, logger),
        });
      },
    });
  },
});

// Add the module to your backend
backend.add(customProviderModule);
```

### Method 2: Separate Backend Module Package

For more complex integrations or when you want to share your provider as a reusable package, create a separate backend module.

1. Create a new backend module package:

   ```bash
   yarn new --scope @internal
   # Select "backend-module"
   # Enter module ID: "infrawallet-module-<provider-name>"
   ```

2. Update the module's `src/index.ts`:

```typescript
import { createBackendModule } from '@backstage/backend-plugin-api';
import { infraWalletCostClientsExtensionPoint } from '@electrolux-oss/plugin-infrawallet-node';
import { MyProviderClient } from './MyProviderClient';

export const infraWalletModuleMyProvider = createBackendModule({
  pluginId: 'infrawallet',
  moduleId: 'my-provider',
  register(env) {
    env.registerInit({
      deps: {
        costClients: infraWalletCostClientsExtensionPoint,
      },
      async init({ costClients }) {
        costClients.registerCostClient({
          provider: 'myprovider',
          factory: (config, database, cache, logger) => 
            new MyProviderClient(config, database, cache, logger),
        });
      },
    });
  },
});

export default infraWalletModuleMyProvider;
```

3. Add the module to your backend's `index.ts`:

```typescript
backend.add(import('@internal/infrawallet-module-my-provider'));
```

## Implementing the Cost Client

Your custom cost client must extend `InfraWalletClient` and implement the following abstract methods:

### Required Methods

```typescript
export class MyCustomProviderClient extends InfraWalletClient {
  // Initialize any API clients or connections
  protected async initCloudClient(integrationConfig: Config): Promise<any> {
    // Return a client object with connection details
    return {
      apiKey: integrationConfig.getString('apiKey'),
      baseUrl: integrationConfig.getString('baseUrl'),
    };
  }

  // Fetch raw cost data from your provider
  protected async fetchCosts(
    integrationConfig: Config,
    client: any,
    query: CostQuery
  ): Promise<any> {
    // Make API calls to fetch cost data
    // Return raw data from your provider
  }

  // Transform provider data to InfraWallet format
  protected async transformCostsData(
    integrationConfig: Config,
    query: CostQuery,
    costResponse: any
  ): Promise<Report[]> {
    // Transform data into Report[] format
    const reports: Report[] = [];
    
    // Each report represents a cost item
    for (const item of costResponse.items) {
      reports.push({
        id: `${item.accountId}_${item.service}`,
        account: `${this.provider}/${item.accountName}`,
        service: `${this.provider}/${item.service}`,
        category: item.category || 'Compute',
        provider: this.provider,
        providerType: PROVIDER_TYPE.INTEGRATION,
        reports: {
          // Map of date -> cost
          '2024-01-01': 100.50,
          '2024-01-02': 105.25,
        },
      });
    }
    
    return reports;
  }
}
```

### Optional Methods

You can override these methods to add tag support:

```typescript
// Get available tag keys
async getTagKeys(query: TagsQuery): Promise<TagsResponse> {
  // Return available tag keys from your provider
  return {
    tags: [
      { key: 'Environment', provider: this.provider },
      { key: 'Project', provider: this.provider },
    ],
    errors: [],
  };
}

// Get tag values for a specific key
async getTagValues(query: TagsQuery, tagKey: string): Promise<TagsResponse> {
  // Return values for the specified tag key
  return {
    tags: [
      { key: tagKey, value: 'production', provider: this.provider },
      { key: tagKey, value: 'staging', provider: this.provider },
    ],
    errors: [],
  };
}
```

## Configuration

Once your custom provider is implemented and registered, configure it in `app-config.yaml`:

```yaml
backend:
  infraWallet:
    integrations:
      # Your custom provider configuration
      mycustomprovider:
        - name: my-account
          apiKey: ${MY_PROVIDER_API_KEY}
          baseUrl: https://api.myprovider.com
          # Add any custom configuration fields your provider needs
          customField: value
```

## Data Format

### Report Object

Each cost report must follow this structure:

```typescript
interface Report {
  id: string;              // Unique identifier for this cost item
  account: string;         // Account name (format: "provider/account-name")
  service: string;         // Service name (format: "provider/service-name")
  category?: string;       // Cost category (e.g., "Compute", "Storage", "Network")
  provider: string;        // Your provider identifier
  providerType: PROVIDER_TYPE; // Use PROVIDER_TYPE.INTEGRATION
  reports: {               // Cost data by date
    [date: string]: number; // Date format: "YYYY-MM-DD" for daily, "YYYY-MM" for monthly
  };
  // Optional fields
  region?: string;
  tags?: { [key: string]: string };
}
```

### Query Parameters

Your cost client will receive queries with these parameters:

```typescript
interface CostQuery {
  startTime: string;      // Unix timestamp in milliseconds
  endTime: string;        // Unix timestamp in milliseconds
  granularity: string;    // "daily" or "monthly"
  filters: string;        // Filter expression
  tags: string;           // Tag filter expression
  groups: string;         // Grouping fields
}
```

## Best Practices

1. **Error Handling**: Always wrap API calls in try-catch blocks and return errors in the response:

   ```typescript
   try {
     // Your implementation
   } catch (error) {
     return {
       reports: [],
       errors: [{
         provider: this.provider,
         name: integrationConfig.getString('name'),
         error: error.message,
       }],
     };
   }
   ```

2. **Caching**: Utilize the provided cache service to reduce API calls:

   ```typescript
   import { getReportsFromCache, setReportsToCache } from '@electrolux-oss/plugin-infrawallet-node';
   
   // Check cache first
   const cached = await getReportsFromCache(this.cache, this.provider, integrationName, query);
   if (cached) return cached;
   
   // Fetch and cache results
   const reports = await this.fetchAndTransform(...);
   await setReportsToCache(this.cache, reports, this.provider, integrationName, query, ttl);
   ```

3. **Logging**: Use the logger service for debugging:

   ```typescript
   this.logger.info(`Fetching costs for ${this.provider}`);
   this.logger.error(`Failed to fetch costs: ${error.message}`);
   ```

4. **Configuration Validation**: Validate required configuration fields early:

   ```typescript
   protected async initCloudClient(integrationConfig: Config): Promise<any> {
     // Validate required fields
     const apiKey = integrationConfig.getString('apiKey');
     if (!apiKey) {
       throw new Error('API key is required for MyProvider');
     }
     // Continue initialization...
   }
   ```

## Example: Mock Provider

Here's a complete example of a mock provider for testing:

```typescript
export class MockProviderClient extends InfraWalletClient {
  constructor(config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService) {
    super(CLOUD_PROVIDER.CUSTOM, config, database, cache, logger);
  }

  protected async initCloudClient(integrationConfig: Config): Promise<any> {
    return { name: integrationConfig.getString('name') };
  }

  protected async fetchCosts(_integrationConfig: Config, client: any, query: CostQuery): Promise<any> {
    // Generate mock data based on query parameters
    const startDate = new Date(parseInt(query.startTime, 10));
    const endDate = new Date(parseInt(query.endTime, 10));
    
    return {
      items: [
        {
          accountId: 'mock-001',
          accountName: client.name,
          service: 'Mock Compute',
          category: 'Compute',
          costs: this.generateMockCosts(startDate, endDate, query.granularity, 100),
        },
      ],
    };
  }

  protected async transformCostsData(
    _integrationConfig: Config,
    query: CostQuery,
    costResponse: any
  ): Promise<Report[]> {
    const reports: Report[] = [];
    
    for (const item of costResponse.items) {
      const report: Report = {
        id: `${item.accountId}_${item.service}`,
        account: `${this.provider}/${item.accountName}`,
        service: `${this.provider}/${item.service}`,
        category: item.category,
        provider: this.provider,
        providerType: PROVIDER_TYPE.INTEGRATION,
        reports: {},
      };
      
      // Add cost data for each period
      for (const cost of item.costs) {
        const dateKey = this.formatDate(cost.date, query.granularity);
        report.reports[dateKey] = cost.amount;
      }
      
      reports.push(report);
    }
    
    return reports;
  }
  
  private generateMockCosts(start: Date, end: Date, granularity: string, baseCost: number): any[] {
    const costs = [];
    const current = new Date(start);
    
    while (current <= end) {
      costs.push({
        date: current.toISOString(),
        amount: baseCost * (0.8 + Math.random() * 0.4), // ±20% variance
      });
      
      if (granularity === 'daily') {
        current.setDate(current.getDate() + 1);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    return costs;
  }
  
  private formatDate(date: string, granularity: string): string {
    const d = new Date(date);
    if (granularity === 'daily') {
      return d.toISOString().split('T')[0];
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
```

## Testing Your Provider

1. Add your provider configuration to `app-config.yaml`
2. Start the backend: `yarn start-backend`
3. Access the InfraWallet UI and verify your provider appears
4. Check that cost data is displayed correctly
5. Test filtering and grouping functionality

## Troubleshooting

- **Provider not appearing**: Ensure your module is added to the backend and the provider key matches your configuration
- **No cost data**: Check logs for errors, verify API credentials, and ensure date ranges are correct
- **Caching issues**: Clear cache or disable caching during development by setting TTL to 0
