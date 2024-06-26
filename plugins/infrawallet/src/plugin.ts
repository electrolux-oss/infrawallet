import {
  createApiFactory,
  createPlugin,
  createRoutableExtension,
  identityApiRef,
  configApiRef,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { infraWalletApiRef } from './api/InfraWalletApi';
import { InfraWalletApiClient } from './api/InfraWalletApiClient';

export const infraWalletPlugin = createPlugin({
  id: 'infrawallet',
  routes: {
    root: rootRouteRef,
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
    component: () => import('./routes').then(m => m.RootRoute),
    mountPoint: rootRouteRef,
  }),
);
