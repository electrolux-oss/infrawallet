/*
 * Hi!
 *
 * Note that this is an EXAMPLE Backstage backend. Please check the README.
 *
 * Happy hacking!
 */

import { createBackend } from '@backstage/backend-defaults';
import { createBackendModule } from '@backstage/backend-plugin-api';
import { infraWalletCostClientsExtensionPoint } from '@electrolux-oss/plugin-infrawallet-node';
import { MyCustomProviderClient } from './customProviders/MyCustomProviderClient';

const backend = createBackend();

// Custom provider module for InfraWallet
const customProviderModule = createBackendModule({
  pluginId: 'infrawallet',
  moduleId: 'custom-provider',
  register(env) {
    env.registerInit({
      deps: {
        costClients: infraWalletCostClientsExtensionPoint,
      },
      async init({ costClients }) {
        costClients.registerCostClient({
          provider: 'mycustomprovider',
          factory: (config, database, cache, logger) => new MyCustomProviderClient(config, database, cache, logger),
        });
      },
    });
  },
});

backend.add(import('@backstage/plugin-app-backend'));

// auth plugin
backend.add(import('@backstage/plugin-auth-backend'));
// See https://backstage.io/docs/backend-system/building-backends/migrating#the-auth-plugin
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
// See https://backstage.io/docs/auth/guest/provider

// permission plugin
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(import('@backstage/plugin-permission-backend-module-allow-all-policy'));

backend.add(import('@backstage/plugin-devtools-backend'));

// InfraWallet plugin
backend.add(import('@electrolux-oss/plugin-infrawallet-backend'));

// Custom InfraWallet provider module
backend.add(customProviderModule);

backend.start();
