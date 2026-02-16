import { Report, Filters, Tag } from '../api/types';

export type TrendBarComponentProps = {
  categories: any[];
  series: Array<{ name: string; data: any[] }>;
  height?: number;
  width?: number;
};

export type MonthRange = {
  startMonth: Date;
  endMonth: Date;
};

export type TopbarComponentProps = {
  aggregatedBy: string;
  aggregatedBySetter: any;
  tags: string[];
  monthRange: MonthRange;
  monthRangeSetter: any;
};

export type FiltersComponentProps = {
  reports: Report[] | undefined;
  filters: Filters;
  monthRange: MonthRange;
  filtersSetter: any;
  selectedTags?: Tag[];
  selectedTagsSetter: any;
  providerErrorsSetter: any;
};

export type QueryComponentProps = {
  filters: string;
  filtersSetter: any;
  groups: string;
  groupsSetter: any;
};

export type ColumnsChartComponentProps = {
  granularity: string;
  granularitySetter: any;
  periods: any[];
  costs: Array<{ name: string; data: any[]; forecast?: any[] }> | undefined;
  metrics?: Array<{ name: string; group?: string; data: any[] }>;
  budgets?: any[];
  forecasts?: Record<string, number>;
  monthRange?: MonthRange;
  height?: number;
  highlightedItem: string | undefined;
  highlightedItemSetter: any;
};

export type PieChartComponentProps = {
  categories: string[] | undefined;
  series: number[] | undefined;
  height?: number;
  highlightedItem: string | undefined;
  highlightedItemSetter: any;
};

export type CostReportsTableComponentProps = {
  reports: Report[] | undefined;
  aggregatedBy: string;
  periods: string[];
};

export type Metric = {
  metricProvider: 'datadog' | 'grafanacloud';
  metricName: string;
  description?: string;
  query: string;
};

export type MetricCardProps = {
  metric: Metric;
  callback: Function;
};

export type BudgetsProps = {
  providerErrorsSetter: any;
};

export type HomePageProps = {
  title?: string;
  subTitle?: string;
};
