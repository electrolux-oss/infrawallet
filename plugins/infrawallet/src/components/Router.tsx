import { default as React } from 'react';
import { Route, Routes } from 'react-router-dom';
import { HomePage } from './HomePage';
import { Overview } from './Overview';
import { Budgets } from './Budgets';
import { CustomCostsComponent } from './CustomCostsComponent';
import { SettingsComponent } from './SettingsComponent';

export const Router = () => {
  return (
    <Routes>
      <Route path="/*" element={<HomePage />}>
        <Route index element={<Overview />} />
        <Route path="overview/*" element={<Overview />} />
        <Route path="budgets/*" element={<Budgets providerErrorsSetter={() => {}} />} />
        <Route path="custom-costs/*" element={<CustomCostsComponent />} />
        <Route path="business-metrics/*" element={<SettingsComponent />} />
      </Route>
    </Routes>
  );
};
