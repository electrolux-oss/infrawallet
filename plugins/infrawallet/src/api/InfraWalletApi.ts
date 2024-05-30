import { createApiRef } from '@backstage/core-plugin-api';
import { CostReportsResponse } from './types';
import { Response } from 'node-fetch';

/** @public */
export const infraWalletApiRef = createApiRef<InfraWalletApi>({
  id: 'plugin.infrawallet',
});

/** @public */
export interface InfraWalletApi {
  get(path: string, headers?: Record<string, string>): Promise<Response>;
  post(
    path: string,
    headers?: Record<string, string>,
    data?: Record<string, any | undefined>,
  ): Promise<Response>;
  put(
    path: string,
    headers?: Record<string, string>,
    data?: Record<string, any | undefined>,
  ): Promise<Response>;
  delete(
    path: string,
    headers?: Record<string, string>,
    data?: Record<string, any | undefined>,
  ): Promise<Response>;
  getCostReports(
    filters: string,
    groups: string,
    granularity: string,
    startTime: Date,
    endTime: Date,
  ): Promise<CostReportsResponse>;
}
