import { createRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({
  id: 'infrawallet',
});

export const settingsRouteRef = createRouteRef({
  id: 'infrawallet:settings',
  params: ['name'],
});
