import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { SettingsComponent } from './SettingsComponent';
import { ReportsComponent, ReportsComponentProps } from './ReportsComponent';

export const Router = (props: ReportsComponentProps) => {
  return (
    <Routes>
        <Route path="/" element={<ReportsComponent {...props} />} />
        <Route path="/:name" element={<ReportsComponent {...props} />} />
        <Route path="/:name/settings" element={<SettingsComponent />} />
    </Routes>
  );
};