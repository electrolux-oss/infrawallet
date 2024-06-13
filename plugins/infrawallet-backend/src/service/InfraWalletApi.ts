import { CostQuery, Report } from "./types";

/** @public */
export type InfraWalletApi = {
  fetchCostsFromCloud(query: CostQuery): Promise<Report[]>;
};
