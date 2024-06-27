import { AwsClient } from './AwsClient';
import { AzureClient } from './AzureClient';
import { GCPClient } from './GCPClient';

export const PROVIDER_CLIENT_MAPPINGS: {
  [provider: string]: any;
} = {
  aws: AwsClient,
  azure: AzureClient,
  gcp: GCPClient,
};
