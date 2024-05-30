export type CostQuery = {
  filters: string;
  groups: string;
  granularity: string;
  startTime: string;
  endTime: string;
};

export type Report = {
  id: string;
  reports?: {
    [period: string]: number;
  };
};

/** @public */
export type InfraWalletApi = {
  fetchCostsFromCloud(query: CostQuery): Promise<Report[]>;
};
