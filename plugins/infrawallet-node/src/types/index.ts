import { GRANULARITY, PROVIDER_TYPE } from '../consts';

export type TagsQuery = {
  startTime: string;
  endTime: string;
};

export type CostQuery = {
  filters: string;
  tags: string;
  groups: string;
  granularity: GRANULARITY;
  startTime: string;
  endTime: string;
};

export type Report = {
  id: string;
  account: string;
  service: string;
  category: string;
  provider: string;
  providerType?: PROVIDER_TYPE;
  reports: {
    [period: string]: number;
  };
  [key: string]: string | number | { [period: string]: number } | undefined;
};

export type Tag = {
  key: string;
  value?: string;
  provider: string;
};

export type CloudProviderError = {
  provider: string; // AWS, GCP, Azure or MongoAtlas
  name: string; // the name defined in the configuration file
  error: string; // error message from the cloud provider
};

export type ClientResponse = {
  reports: Report[];
  errors: CloudProviderError[];
};

export type TagsResponse = {
  tags: Tag[];
  errors: CloudProviderError[];
};

export type Wallet = {
  id: string;
  name: string;
  currenty: string;
  description?: string;
};

export type Filter = {
  type: string; // 'include' or 'exclude'
  attribute: string;
  pattern: string;
};
