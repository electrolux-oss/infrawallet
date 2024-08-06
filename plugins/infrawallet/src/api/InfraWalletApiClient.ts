import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';
import fetch from 'node-fetch';
import { InfraWalletApi } from './InfraWalletApi';
import { CostReportsResponse, MetricsResponse } from './types';

/** @public */
export class InfraWalletApiClient implements InfraWalletApi {
  private readonly identityApi: IdentityApi;
  private readonly backendUrl: string;

  constructor(options: { identityApi: IdentityApi; configApi: ConfigApi }) {
    this.identityApi = options.identityApi;
    this.backendUrl = options.configApi.getString('backend.baseUrl');
  }

  async get(path: string): Promise<any> {
    const url = `${this.backendUrl}/${path}`;
    const { token: idToken } = await this.identityApi.getCredentials();
    const response = await fetch(url, {
      headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
    });

    if (!response.ok) {
      const payload = await response.text();
      const message = `Request failed with ${response.status} ${response.statusText}, ${payload}`;
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
    return await this.get(url);
  }

  async getMetrics(granularity: string, startTime: Date, endTime: Date): Promise<MetricsResponse> {
    const url = `api/infrawallet/metrics?&granularity=${granularity}&startTime=${startTime.getTime()}&endTime=${endTime.getTime()}`;
    return await this.get(url);
  }
}
