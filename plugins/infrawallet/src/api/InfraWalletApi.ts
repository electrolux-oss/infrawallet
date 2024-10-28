import { createApiRef } from '@backstage/core-plugin-api';
import {
  Budget,
  BudgetsResponse,
  CostReportsResponse,
  CustomCost,
  CustomCostsResponse,
  GetWalletResponse,
  MetricConfigsResponse,
  MetricSetting,
  MetricsResponse,
  MetricsSettingResponse,
  Tag,
  TagResponse,
} from './types';

/** @public */
export const infraWalletApiRef = createApiRef<InfraWalletApi>({
  id: 'plugin.infrawallet',
});

/** @public */
export interface InfraWalletApi {
  getCostReports(
    filters: string,
    tags: Tag[],
    groups: string,
    granularity: string,
    startTime: Date,
    endTime: Date,
  ): Promise<CostReportsResponse>;
  getTagKeys(provider: string, startTime: Date, endTime: Date): Promise<TagResponse>;
  getTagValues(tag: Tag, startTime: Date, endTime: Date): Promise<TagResponse>;
  getBudgets(walletName: string): Promise<BudgetsResponse>;
  getBudget(walletName: string, provider: string): Promise<BudgetsResponse>;
  updateBudget(walletName: string, budget: Budget): Promise<{ updated: boolean; status: number }>;
  getMetrics(walletName: string, granularity: string, startTime: Date, endTime: Date): Promise<MetricsResponse>;
  getMetricConfigs(): Promise<MetricConfigsResponse>;
  getWalletMetricsSetting(walletName: string): Promise<MetricsSettingResponse>;
  updateWalletMetricSetting(
    walletName: string,
    metricSetting: MetricSetting,
  ): Promise<{ updated: boolean; status: number }>;
  deleteWalletMetricSetting(
    walletName: string,
    metricSetting: MetricSetting,
  ): Promise<{ deleted: boolean; status: number }>;
  getWalletByName(walletName: string): Promise<GetWalletResponse>;
  getCustomCosts(): Promise<CustomCostsResponse>;
  createCustomCosts(customCosts: CustomCost[]): Promise<{ created: number; status: number }>;
  updateCustomCost(customCost: CustomCost): Promise<{ updated: boolean; status: number }>;
  deleteCustomCost(customCost: CustomCost): Promise<{ deleted: boolean; status: number }>;
}
