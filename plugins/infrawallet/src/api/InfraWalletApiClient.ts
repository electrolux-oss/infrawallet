import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';
import fetch from 'node-fetch';
import { InfraWalletApi } from './InfraWalletApi';
import { tagsToString } from './functions';
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
export class InfraWalletApiClient implements InfraWalletApi {
  private readonly identityApi: IdentityApi;
  private readonly backendUrl: string;

  constructor(options: { identityApi: IdentityApi; configApi: ConfigApi }) {
    this.identityApi = options.identityApi;
    this.backendUrl = options.configApi.getString('backend.baseUrl');
  }

  async request(path: string, method?: string, payload?: Record<string, any>) {
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
    tags: Tag[],
    groups: string,
    granularity: string,
    startTime: Date,
    endTime: Date,
  ): Promise<CostReportsResponse> {
    const tagsString = tagsToString(tags);
    const url = `api/infrawallet/reports?granularity=${granularity}&groups=${groups}&filters=${filters}&tags=${tagsString}&startTime=${startTime.getTime()}&endTime=${endTime.getTime()}`;

    return await this.request(url);
  }

  async getTagKeys(provider: string, startTime: Date, endTime: Date): Promise<TagResponse> {
    const url = `api/infrawallet/tag-keys?provider=${provider}&startTime=${startTime.getTime()}&endTime=${endTime.getTime()}`;
    return await this.request(url);
  }

  async getTagValues(tag: Tag, startTime: Date, endTime: Date): Promise<TagResponse> {
    const provider = tag.provider;
    const tagKey = tag.key;
    const url = `api/infrawallet/tag-values?provider=${provider}&tag=${tagKey}&startTime=${startTime.getTime()}&endTime=${endTime.getTime()}`;
    return await this.request(url);
  }

  async getBudgets(walletName: string): Promise<BudgetsResponse> {
    const url = `api/infrawallet/${walletName}/budgets`;
    return await this.request(url);
  }

  async getBudget(walletName: string, provider: string): Promise<BudgetsResponse> {
    const url = `api/infrawallet/${walletName}/budgets?provider=${provider}`;
    return await this.request(url);
  }

  async updateBudget(walletName: string, budget: Budget): Promise<{ updated: boolean; status: number }> {
    const url = `api/infrawallet/${walletName}/budgets`;
    return await this.request(url, 'PUT', budget);
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
    const url = 'api/infrawallet/metric/metric-configs';
    return await this.request(url);
  }

  async getWalletMetricsSetting(walletName: string): Promise<MetricsSettingResponse> {
    const url = `api/infrawallet/${walletName}/metrics-setting`;
    return await this.request(url);
  }

  async updateWalletMetricSetting(
    walletName: string,
    metricSetting: MetricSetting,
  ): Promise<{ updated: boolean; status: number }> {
    const url = `api/infrawallet/${walletName}/metrics-setting`;
    return await this.request(url, 'PUT', metricSetting);
  }

  async deleteWalletMetricSetting(
    walletName: string,
    metricSetting: MetricSetting,
  ): Promise<{ deleted: boolean; status: number }> {
    const url = `api/infrawallet/${walletName}/metrics-setting`;
    return await this.request(url, 'DELETE', metricSetting);
  }

  async getCustomCosts(): Promise<CustomCostsResponse> {
    const url = `api/infrawallet/custom-costs`;
    return await this.request(url);
  }

  async createCustomCosts(customCosts: CustomCost[]): Promise<{ created: number; status: number }> {
    const url = `api/infrawallet/custom-costs`;
    return await this.request(url, 'POST', customCosts);
  }

  async updateCustomCost(customCost: CustomCost): Promise<{ updated: boolean; status: number }> {
    const url = `api/infrawallet/custom-cost`;
    return await this.request(url, 'PUT', customCost);
  }

  async deleteCustomCost(customCost: CustomCost): Promise<{ deleted: boolean; status: number }> {
    const url = `api/infrawallet/custom-cost`;
    return await this.request(url, 'DELETE', customCost);
  }
}
