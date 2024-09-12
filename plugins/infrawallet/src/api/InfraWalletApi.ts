import { createApiRef } from '@backstage/core-plugin-api';
import {
  CostReportsResponse,
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
}
