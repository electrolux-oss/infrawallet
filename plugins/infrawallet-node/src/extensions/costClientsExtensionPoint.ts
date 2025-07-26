import { createExtensionPoint } from '@backstage/backend-plugin-api';
import { CacheService, DatabaseService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { InfraWalletClient } from '../InfraWalletClient';

export interface CostClientFactory {
  (config: Config, database: DatabaseService, cache: CacheService, logger: LoggerService): InfraWalletClient;
}

export interface CostClientRegistration {
  provider: string;
  factory: CostClientFactory;
}

export interface InfraWalletCostClientsExtensionPoint {
  registerCostClient(registration: CostClientRegistration): void;
}

export const infraWalletCostClientsExtensionPoint = 
  createExtensionPoint<InfraWalletCostClientsExtensionPoint>({
    id: 'infrawallet.costClients',
  });