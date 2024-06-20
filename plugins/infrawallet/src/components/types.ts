import { Report } from '../api/types';

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

export type QueryComponentProps = {
  filters: string;
  filtersSetter: any;
  groups: string;
  groupsSetter: any;
};

export type ColumnsChartComponentProps = {
  granularitySetter: any;
  categories: any[];
  series: Array<{ name: string; data: any[] }>;
  height?: number;
  thumbnail?: boolean;
  dataPointSelectionHandler?: (
    event: any,
    chartContext: any,
    config: any,
  ) => void;
};

export type PieChartComponentProps = {
  categories: string[];
  series: number[];
  height?: number;
};

export type CostReportsTableComponentProps = {
  reports: Report[];
  aggregatedBy: string;
};
