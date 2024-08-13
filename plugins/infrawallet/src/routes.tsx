import { createRouteRef } from '@backstage/core-plugin-api';
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ReportsComponent } from './components/ReportsComponent';
import { SettingsComponent } from './components/SettingsComponent';

export const rootRouteRef = createRouteRef({
  id: 'infrawallet',
  params: ['name'],
});

export const RootRoute = () => (
  <Routes>
    <Route path="/" element={<ReportsComponent />} />
    <Route path="/:name" element={<ReportsComponent />} />
    <Route path="/:name/settings" element={<SettingsComponent />} />
  </Routes>
);
