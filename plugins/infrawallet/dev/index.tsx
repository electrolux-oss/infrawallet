import { createDevApp } from '@backstage/dev-utils';
import { default as React } from 'react';
import { InfraWalletPage, infraWalletPlugin } from '../src/plugin';

createDevApp()
  .registerPlugin(infraWalletPlugin)
  .addPage({
    element: <InfraWalletPage />,
    title: 'Root Page',
    path: '/infrawallet',
  })
  .render();
