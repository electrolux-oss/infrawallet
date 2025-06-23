import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import { apis } from './apis';
import { Root } from './components/Root';

import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { AlertDisplay, OAuthRequestDialog, SignInPage } from '@backstage/core-components';
import { DevToolsPage } from '@backstage/plugin-devtools';
import { InfraWalletPage } from '@electrolux-oss/plugin-infrawallet';

const app = createApp({
  apis,
  components: {
    SignInPage: props => <SignInPage {...props} auto providers={['guest']} />,
  },
});

const routes = (
  <FlatRoutes>
    <Route path="/" element={<Navigate to="infrawallet" />} />
    <Route path="/infrawallet" element={<InfraWalletPage />} />
    <Route path="/devtools" element={<DevToolsPage />} />
  </FlatRoutes>
);

export default app.createRoot(
  <>
    <AlertDisplay />
    <OAuthRequestDialog />
    <AppRouter>
      <Root>{routes}</Root>
    </AppRouter>
  </>,
);
