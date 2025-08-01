import { CacheService, DatabaseService, LoggerService, SchedulerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { type CostClientRegistration, type CloudProviderError } from '@electrolux-oss/plugin-infrawallet-node';

// Re-export types from node package for backward compatibility
export type {
  Report,
  Tag,
  CloudProviderError,
  ClientResponse,
  TagsResponse,
  TagsQuery,
  CostQuery,
  Wallet,
  Filter,
} from '@electrolux-oss/plugin-infrawallet-node';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  scheduler: SchedulerService;
  cache: CacheService;
  database: DatabaseService;
  costClientRegistry?: Map<string, CostClientRegistration>;
}

export type CategoryMappings = {
  [category: string]: {
    [provider: string]: string[];
  };
};

export type ServiceToCategoryMappings = {
  [provider: string]: { [service: string]: string };
};

export type MetricQuery = {
  walletName: string;
  name?: string;
  query?: string;
  startTime: string;
  endTime: string;
  granularity: string;
};

export type Metric = {
  id: string;
  provider: string;
  group?: string;
  name: string;
  reports: {
    [period: string]: number;
  };
};

export type MetricResponse = {
  metrics: Metric[];
  errors: CloudProviderError[];
};

export type MetricSetting = {
  id: string;
  wallet_id: string;
  metric_provider: string;
  config_name: string;
  metric_name: string;
  description?: string;
  group?: string;
  query: string;
};
