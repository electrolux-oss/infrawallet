export type CategoryMappings = {
  [category: string]: {
    [provider: string]: string[];
  };
};

export type ServiceToCategoryMappings = {
  [provider: string]: { [service: string]: string };
};

export type TagsQuery = {
  startTime: string;
  endTime: string;
};

export type CostQuery = {
  filters: string;
  tags: string;
  groups: string;
  granularity: string;
  startTime: string;
  endTime: string;
};

export type Report = {
  id: string;
  account: string;
  service: string;
  category: string;
  provider: string;
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
