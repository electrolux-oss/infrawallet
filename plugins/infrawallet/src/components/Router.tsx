import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { CustomCostsComponent } from './CustomCostsComponent';
import { ReportsComponent, ReportsComponentProps } from './ReportsComponent';
import { SettingsComponent } from './SettingsComponent';

export const Router = (props: ReportsComponentProps) => {
  return (
    <Routes>
      <Route path="/" element={<ReportsComponent {...props} />} />
      <Route path="/custom_costs" element={<CustomCostsComponent />} />
      <Route path="/:name" element={<ReportsComponent {...props} />} />
      <Route path="/:name/settings" element={<SettingsComponent />} />
    </Routes>
  );
};
