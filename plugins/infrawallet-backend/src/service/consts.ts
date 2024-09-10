import { AwsClient } from '../cost-clients/AwsClient';
import { AzureClient } from '../cost-clients/AzureClient';
import { GCPClient } from '../cost-clients/GCPClient';
import { DatadogProvider } from '../metric-providers/DatadogProvider';
import { GrafanaCloudProvider } from '../metric-providers/GrafanaCloudProvider';
import { MockProvider } from '../metric-providers/MockProvider';
import { MockClient } from '../cost-clients/MockClient';
import { ConfluentClient } from '../cost-clients/ConfluentClient';
import { MongoAtlasClient } from '../cost-clients/MongoAtlasClient';

// Supported cloud providers to extract costs
export const enum CLOUD_PROVIDER {
  AWS = 'AWS',
  GCP = 'GCP',
  AZURE = 'Azure',
  MONGODB_ATLAS = 'MongoAtlas',
  CONFLUENT = 'Confluent',
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
  mock: MockClient,
};

export const METRIC_PROVIDER_MAPPINGS: {
  [provider: string]: any;
} = {
  datadog: DatadogProvider,
  grafanacloud: GrafanaCloudProvider,
  mock: MockProvider,
};

export const enum CACHE_CATEGORY {
  COSTS = 'costs',
  TAGS = 'tags',
  METRICS = 'metrics',
}

export const DEFAULT_TAGS_CACHE_TTL: {
  [provider in CLOUD_PROVIDER]: number;
} = {
  [CLOUD_PROVIDER.AWS]: 1 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.AZURE]: 12 * 60 * 60 * 1000, // 12 hours due to Azure rate limit
  [CLOUD_PROVIDER.GCP]: 1 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.MONGODB_ATLAS]: 1 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.CONFLUENT]: 1 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.MOCK]: 0,
};

export const DEFAULT_COSTS_CACHE_TTL: {
  [provider in CLOUD_PROVIDER]: number;
} = {
  [CLOUD_PROVIDER.AWS]: 2 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.AZURE]: 12 * 60 * 60 * 1000, // 12 hours due to Azure rate limit
  [CLOUD_PROVIDER.GCP]: 2 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.MONGODB_ATLAS]: 2 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.CONFLUENT]: 2 * 60 * 60 * 1000,
  [CLOUD_PROVIDER.MOCK]: 0,
};
