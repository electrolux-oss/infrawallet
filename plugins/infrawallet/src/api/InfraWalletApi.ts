import { createApiRef } from '@backstage/core-plugin-api';
import { CostReportsResponse } from './types';
import { Response } from 'node-fetch';

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
}
