import { createRouteRef } from '@backstage/core-plugin-api';
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ReportsComponent } from './components/ReportsComponent';

export const rootRouteRef = createRouteRef({
  id: 'infrawallet',
});

export const RootRoute = () => (
  <Routes>
    <Route path="/" element={<ReportsComponent />} />
  </Routes>
);
