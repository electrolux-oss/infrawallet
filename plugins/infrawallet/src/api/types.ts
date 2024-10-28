export type Report = {
  id: string;
  [dimension: string]: string | { [period: string]: number } | undefined;
  reports: {
    [period: string]: number;
  };
};

export type Tag = {
  key: string;
  value?: string;
  provider: string;
};

export type Filters = {
  [key: string]: string[];
};

export type CloudProviderError = {
  provider: string;
  name: string; // the name defined in the configuration file
  error: string;
};

export type CostReportsResponse = {
  data?: Report[];
  errors?: CloudProviderError[];
  status: number;
};

export type TagResponse = {
  data?: Tag[];
  errors?: CloudProviderError[];
  status: number;
};

export type Budget = {
  id?: string;
  provider: string;
  name: string;
  amount: number;
};

export type BudgetsResponse = {
  data?: Budget[];
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

export type MetricConfig = {
  metric_provider: string;
  config_name: string;
};

export type MetricConfigsResponse = {
  data?: MetricConfig[];
  status: number;
};

export type MetricsResponse = {
  data?: Metric[];
  errors?: CloudProviderError[];
  status: number;
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

export type MetricsSettingResponse = {
  data?: MetricSetting[];
  status: number;
};

export type Wallet = {
  id: string;
  name: string;
  currency: string;
  description?: string;
};

export type GetWalletResponse = {
  data?: Wallet;
  status: number;
};

export type CustomCost = {
  id?: string; // UUID
  provider: string;
  account: string;
  service: string;
  category: string;
  currency: string;
  amortization_mode: string; // average, as_it_is
  usage_month: number; // format YYYYMM
  cost?: number;
  tags?: Record<string, string>; // JSON object with key-value pairs
};

export type CustomCostsResponse = {
  data?: CustomCost[];
  status: number;
};
