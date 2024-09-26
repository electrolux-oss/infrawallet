import {
  createApiFactory,
  createPlugin,
  createRoutableExtension,
  createComponentExtension,
  identityApiRef,
  configApiRef,
} from '@backstage/core-plugin-api';

import { rootRouteRef, settingsRouteRef } from './routes';
import { infraWalletApiRef } from './api/InfraWalletApi';
import { InfraWalletApiClient } from './api/InfraWalletApiClient';

export const infraWalletPlugin = createPlugin({
  id: 'infrawallet',
  routes: {
    root: rootRouteRef,
    settings: settingsRouteRef,
  },
  apis: [
    createApiFactory({
      api: infraWalletApiRef,
      deps: { identityApi: identityApiRef, configApi: configApiRef },
      factory: ({ identityApi, configApi }) => new InfraWalletApiClient({ identityApi, configApi }),
    }),
  ],
});

export const InfraWalletPage = infraWalletPlugin.provide(
  createRoutableExtension({
    name: 'InfraWalletPage',
    component: () => import('./components/Router').then(m => m.Router),
    mountPoint: rootRouteRef,
  }),
);

export const EntityInfraWalletCard = infraWalletPlugin.provide(
  createComponentExtension({
    name: 'EntityInfraWalletCard',
    component: {
      lazy: () => import('./components/EntityInfraWalletCard').then(m => m.EntityInfraWalletCard),
    },
  }),
);
