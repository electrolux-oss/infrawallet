export type Report = {
  id: string;
  [dimension: string]: string | { [period: string]: number } | undefined;
  reports: {
    [period: string]: number;
  };
};

export type Filters = {
  [key: string]: string[];
};

export type CloudProviderError = {
  provider: string; // AWS, GCP or Azure
  name: string; // the name defined in the configuration file
  error: string; // error message from the cloud provider
};

export type CostReportsResponse = {
  data?: Report[];
  errors?: CloudProviderError[];
  status: number;
};

// for now it is the same as type Report
// but still would like to keep them separate for future changes
export type Metric = {
  id: string;
  [dimension: string]: string | { [period: string]: number } | undefined;
  reports: {
    [period: string]: number;
  };
};

export type MetricsResponse = {
  data?: Metric[];
  errors?: CloudProviderError[];
  status: number;
};
