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
