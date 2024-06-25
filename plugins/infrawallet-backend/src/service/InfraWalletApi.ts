import { CostQuery, ClientResponse } from './types';

/** @public */
export type InfraWalletApi = {
  fetchCostsFromCloud(query: CostQuery): Promise<ClientResponse>;
};
