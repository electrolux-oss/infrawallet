import { AwsClient } from './AwsClient';
import { AzureClient } from './AzureClient';
import { DatadogProvider } from './DatadogProvider';
import { GCPClient } from './GCPClient';
import { GrafanaCloudProvider } from './GrafanaCloudProvider';
import { MockClient } from './MockClient';

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
};
