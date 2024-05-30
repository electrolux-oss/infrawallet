import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';
import fetch, { Response } from 'node-fetch';
import { InfraWalletApi } from './InfraWalletApi';
import { CostReportsResponse } from './types';

/** @public */
export class InfraWalletApiClient implements InfraWalletApi {
  private readonly identityApi: IdentityApi;
  private readonly backendUrl: string;

  constructor(options: { identityApi: IdentityApi; configApi: ConfigApi }) {
    this.identityApi = options.identityApi;
    this.backendUrl = options.configApi.getString('backend.baseUrl');
  }

  async get(path: string, headers?: Record<string, string>): Promise<Response> {
    return await this.requestRaw(`${this.backendUrl}/${path}`, headers);
  }

  async post(
    path: string,
    headers?: Record<string, string>,
    data?: Record<string, any | undefined>,
  ): Promise<Response> {
    const hdrs = {
      ...headers,
      'Content-Type': 'application/json',
    };
    const method = 'POST';

    return await this.requestRaw(
      `${this.backendUrl}/${path}`,
      hdrs,
      method,
      data,
    );
  }

  async put(
    path: string,
    headers?: Record<string, string>,
    data?: Record<string, any | undefined>,
  ): Promise<Response> {
    const hdrs = {
      ...headers,
      'Content-Type': 'application/json',
    };
    const method = 'PUT';

    return await this.requestRaw(
      `${this.backendUrl}/${path}`,
      hdrs,
      method,
      data,
    );
  }

  async delete(
    path: string,
    headers?: Record<string, string>,
    data?: Record<string, any | undefined>,
  ): Promise<Response> {
    const hdrs = {
      ...headers,
      'Content-Type': 'application/json',
    };
    const method = 'DELETE';

    return await this.requestRaw(
      `${this.backendUrl}/${path}`,
      hdrs,
      method,
      data,
    );
  }

  async requestRaw(
    url: string,
    headers?: Record<string, string>,
    method?: string,
    data?: Record<string, any | undefined>,
  ): Promise<Response> {
    let payload;
    if (!method) {
      payload = {
        method: 'GET',
        headers,
      };
    } else {
      payload = {
        method,
        headers,
        body: JSON.stringify(data),
      };
    }

    return await fetch(url, payload);
  }

  async getCostReports(
    filters: string,
    groups: string,
    granularity: string,
    startTime: Date,
    endTime: Date,
  ): Promise<CostReportsResponse> {
    const { token: idToken } = await this.identityApi.getCredentials();
    const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};

    const url = `api/infrawallet/reports?&filters=${filters}&groups=${groups}&granularity=${granularity}&startTime=${startTime.getTime()}&endTime=${endTime.getTime()}`;
    const response = await this.get(url, headers);

    if (!response.ok) {
      const r = await response.json();
      throw new Error(r.error.message);
    } else {
      return await response.json();
    }
  }
}
