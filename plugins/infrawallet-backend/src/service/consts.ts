import { AwsClient } from '../cost-clients/AwsClient';
import { AzureClient } from '../cost-clients/AzureClient';
import { ConfluentClient } from '../cost-clients/ConfluentClient';
import { CustomProviderClient } from '../cost-clients/CustomProviderClient';
import { DatadogClient } from '../cost-clients/DatadogClient';
import { ElasticCloudClient } from '../cost-clients/ElasticCloudClient';
import { GCPClient } from '../cost-clients/GCPClient';
import { MockClient } from '../cost-clients/MockClient';
import { MongoAtlasClient } from '../cost-clients/MongoAtlasClient';
import { GitHubClient } from '../cost-clients/GitHubClient';
import { DatadogProvider } from '../metric-providers/DatadogProvider';
import { GrafanaCloudProvider } from '../metric-providers/GrafanaCloudProvider';
import { MockProvider } from '../metric-providers/MockProvider';

// Supported cloud providers to extract costs
export const enum CLOUD_PROVIDER {
  AWS = 'AWS',
  GCP = 'GCP',
  AZURE = 'Azure',
  MONGODB_ATLAS = 'MongoAtlas',
  CONFLUENT = 'Confluent',
  DATADOG = 'Datadog',
  ELASTIC_CLOUD = 'ElasticCloud',
  GITHUB = 'GitHub',
  CUSTOM = 'Custom',
  MOCK = 'Mock',
}

export const COST_CLIENT_MAPPINGS: {
  [provider: string]: any;
} = {
  aws: AwsClient,
  azure: AzureClient,
  gcp: GCPClient,
  confluent: ConfluentClient,
  mongoatlas: MongoAtlasClient,
  datadog: DatadogClient,
  elasticcloud: ElasticCloudClient,
  github: GitHubClient,
  custom: CustomProviderClient,
  mock: MockClient,
};

export const METRIC_PROVIDER_MAPPINGS: {
  [provider: string]: any;
} = {
  datadog: DatadogProvider,
  grafanacloud: GrafanaCloudProvider,
  mock: MockProvider,
};

export const enum GRANULARITY {
  DAILY = 'daily',
  MONTHLY = 'monthly',
}

export const enum CACHE_CATEGORY {
  COSTS = 'costs',
  TAGS = 'tags',
  METRICS = 'metrics',
  CATEGORY_MAPPINGS = 'category_mappings',
}

export const DEFAULT_CATEGORY_MAPPING_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

export const DEFAULT_TAGS_CACHE_TTL: {
  [provider in CLOUD_PROVIDER]: number;
} = {
  [CLOUD_PROVIDER.AWS]: 1 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.AZURE]: 12 * 60 * 60 * 1000, // 12 hours due to Azure rate limit
  [CLOUD_PROVIDER.GCP]: 1 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.MONGODB_ATLAS]: 1 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.CONFLUENT]: 1 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.DATADOG]: 1 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.ELASTIC_CLOUD]: 1 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.GITHUB]: 1 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.CUSTOM]: 1,
  [CLOUD_PROVIDER.MOCK]: 0, // NOTE: 0 means never expired!
};

export const DEFAULT_COSTS_CACHE_TTL: {
  [provider in CLOUD_PROVIDER]: number;
} = {
  [CLOUD_PROVIDER.AWS]: 2 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.AZURE]: 12 * 60 * 60 * 1000, // 12 hours due to Azure rate limit
  [CLOUD_PROVIDER.GCP]: 2 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.MONGODB_ATLAS]: 2 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.CONFLUENT]: 2 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.DATADOG]: 2 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.ELASTIC_CLOUD]: 2 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.GITHUB]: 2 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.CUSTOM]: 1, // do not cache custom costs since they are in the plugin database
  [CLOUD_PROVIDER.MOCK]: 0, // NOTE: 0 means never expired!
};

export const enum PROVIDER_TYPE {
  INTEGRATION = 'Integration',
  CUSTOM = 'Custom',
}

export const NUMBER_OF_MONTHS_FETCHING_HISTORICAL_COSTS: {
  [provider in CLOUD_PROVIDER]: number;
} = {
  [CLOUD_PROVIDER.AWS]: 18,
  // for Azure it cannot be 1 year otherwise Azure API will respond with the following error
  // Invalid query definition: The time period for pulling the data cannot exceed 1 year(s)
  [CLOUD_PROVIDER.AZURE]: 11, // 12 hours due to Azure rate limit
  [CLOUD_PROVIDER.GCP]: 18,
  [CLOUD_PROVIDER.MONGODB_ATLAS]: 18,
  [CLOUD_PROVIDER.CONFLUENT]: 11,
  [CLOUD_PROVIDER.DATADOG]: 12,
  [CLOUD_PROVIDER.ELASTIC_CLOUD]: 11,
  [CLOUD_PROVIDER.GITHUB]: 12,
  [CLOUD_PROVIDER.CUSTOM]: 0, // NOT USED
  [CLOUD_PROVIDER.MOCK]: 0, // NOT USED
};
