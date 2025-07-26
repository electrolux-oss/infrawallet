/**
 * Node.js library for the infrawallet plugin.
 *
 * @packageDocumentation
 */

// Main exports
export { InfraWalletClient } from './InfraWalletClient';

// Extension points
export { 
  infraWalletCostClientsExtensionPoint,
  type InfraWalletCostClientsExtensionPoint,
  type CostClientRegistration,
  type CostClientFactory,
} from './extensions/costClientsExtensionPoint';

// Types
export * from './types';

// Constants
export * from './consts';
