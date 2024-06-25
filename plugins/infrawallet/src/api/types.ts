export type Report = {
  id: string;
  [dimension: string]: string | { [period: string]: number } | undefined;
  reports: {
    [period: string]: number;
  };
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
