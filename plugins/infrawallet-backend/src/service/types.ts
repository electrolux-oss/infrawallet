export type CategoryMapping = {
  id: string;
  provider: string;
  category: string;
  cloud_service_names: string[];
};

export type CostQuery = {
  filters: string;
  groups: string;
  granularity: string;
  startTime: string;
  endTime: string;
};

export type Report = {
  id: string;
  service: string;
  category: string;
  provider: string;
  name: string;
  reports: {
    [period: string]: number;
  };
};

export type CloudProviderError = {
  provider: string; // AWS, GCP or Azure
  name: string; // the name defined in the configuration file
  error: string; // error message from the cloud provider
};

export type ClientResponse = {
  reports: Report[];
  errors: CloudProviderError[];
};

export type MetricQuery = {
  name?: string;
  query?: string;
  startTime: string;
  endTime: string;
  granularity: string;
};

export type Metric = {
  id: string;
  provider: string;
  name: string;
  reports: {
    [period: string]: number;
  };
};

export type MetricResponse = {
  metrics: Metric[];
  errors: CloudProviderError[];
};
