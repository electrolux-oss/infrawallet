import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';
import fetch from 'node-fetch';
import { InfraWalletApi } from './InfraWalletApi';
import {
  CostReportsResponse,
  GetWalletResponse,
  MetricConfigsResponse,
  MetricSetting,
  MetricsResponse,
  MetricsSettingResponse,
} from './types';

/** @public */
export class InfraWalletApiClient implements InfraWalletApi {
  private readonly identityApi: IdentityApi;
  private readonly backendUrl: string;

  constructor(options: { identityApi: IdentityApi; configApi: ConfigApi }) {
    this.identityApi = options.identityApi;
    this.backendUrl = options.configApi.getString('backend.baseUrl');
  }

  async request(path: string, method?: string, payload?: Record<string, string | undefined>) {
    const url = `${this.backendUrl}/${path}`;
    const { token: idToken } = await this.identityApi.getCredentials();
    const headers: Record<string, string> = idToken ? { Authorization: `Bearer ${idToken}` } : {};

    if (method !== undefined && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    const request: any = {
      headers: headers,
      method: method ?? 'GET',
    };

    if (payload) {
      request.body = JSON.stringify(payload);
    }

    const response = await fetch(url, request);

    if (!response.ok) {
      const res = await response.text();
      const message = `Request failed with ${response.status} ${response.statusText}, ${res}`;
      throw new Error(message);
    }

    return await response.json();
  }

  async getCostReports(
    filters: string,
    groups: string,
    granularity: string,
    startTime: Date,
    endTime: Date,
  ): Promise<CostReportsResponse> {
    const url = `api/infrawallet/reports?&filters=${filters}&groups=${groups}&granularity=${granularity}&startTime=${startTime.getTime()}&endTime=${endTime.getTime()}`;
    return await this.request(url);
  }

  async getWalletByName(walletName: string): Promise<GetWalletResponse> {
    const url = `api/infrawallet/${walletName}`;
    return await this.request(url);
  }

  async getMetrics(walletName: string, granularity: string, startTime: Date, endTime: Date): Promise<MetricsResponse> {
    const url = `api/infrawallet/${walletName}/metrics?&granularity=${granularity}&startTime=${startTime.getTime()}&endTime=${endTime.getTime()}`;
    return await this.request(url);
  }

  async getMetricConfigs(): Promise<MetricConfigsResponse> {
    const url = 'api/infrawallet/metric/metric_configs';
    return await this.request(url);
  }

  async getWalletMetricsSetting(walletName: string): Promise<MetricsSettingResponse> {
    const url = `api/infrawallet/${walletName}/metrics_setting`;
    return await this.request(url);
  }
  async updateWalletMetricSetting(
    walletName: string,
    metricSetting: MetricSetting,
  ): Promise<{ updated: boolean; status: number }> {
    const url = `api/infrawallet/${walletName}/metrics_setting`;
    return await this.request(url, 'PUT', metricSetting);
  }

  async deleteWalletMetricSetting(
    walletName: string,
    metricSetting: MetricSetting,
  ): Promise<{ deleted: boolean; status: number }> {
    const url = `api/infrawallet/${walletName}/metrics_setting`;
    return await this.request(url, 'DELETE', metricSetting);
  }
}
