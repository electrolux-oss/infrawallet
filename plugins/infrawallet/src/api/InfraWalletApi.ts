import { createApiRef } from '@backstage/core-plugin-api';
import { Response } from 'node-fetch';
import { CostReportsResponse, MetricsResponse } from './types';

/** @public */
export const infraWalletApiRef = createApiRef<InfraWalletApi>({
  id: 'plugin.infrawallet',
});

/** @public */
export interface InfraWalletApi {
  get(path: string): Promise<Response>;
  getCostReports(
    filters: string,
    groups: string,
    granularity: string,
    startTime: Date,
    endTime: Date,
  ): Promise<CostReportsResponse>;
  getMetrics(granularity: string, startTime: Date, endTime: Date): Promise<MetricsResponse>;
}
