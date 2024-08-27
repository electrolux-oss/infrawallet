import { AwsClient } from '../cost-clients/AwsClient';
import { AzureClient } from '../cost-clients/AzureClient';
import { GCPClient } from '../cost-clients/GCPClient';
import { DatadogProvider } from '../metric-providers/DatadogProvider';
import { GrafanaCloudProvider } from '../metric-providers/GrafanaCloudProvider';
import { MockProvider } from '../metric-providers/MockProvider';
import { MockClient } from '../cost-clients/MockClient';

export const COST_CLIENT_MAPPINGS: {
  [provider: string]: any;
} = {
  aws: AwsClient,
  azure: AzureClient,
  gcp: GCPClient,
  mock: MockClient,
};

export const METRIC_PROVIDER_MAPPINGS: {
  [provider: string]: any;
} = {
  datadog: DatadogProvider,
  grafanacloud: GrafanaCloudProvider,
  mock: MockProvider,
};
