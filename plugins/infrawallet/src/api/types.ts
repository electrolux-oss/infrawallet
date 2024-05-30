export type Report = {
  id: string;
  [dimension: string]: string | { [period: string]: number } | undefined;
  reports: {
    [period: string]: number;
  };
};

export type CostReportsResponse = {
  data?: Report[];
  status: string;
};
