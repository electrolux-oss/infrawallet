import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { infraWalletPlugin, InfraWalletPage } from '../src/plugin';

createDevApp()
  .registerPlugin(infraWalletPlugin)
  .addPage({
    element: <InfraWalletPage />,
    title: 'Root Page',
    path: '/infrawallet',
  })
  .render();
