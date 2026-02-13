import { default as React } from 'react';
import { Route, Routes } from 'react-router-dom';
import { HomePageComponent } from './HomePageComponent';
import { OverviewComponent } from './OverviewComponent';
import { Budgets } from './Budgets';
import { CustomCostsComponent } from './CustomCostsComponent';
import { SettingsComponent } from './SettingsComponent';

export const Router = () => {
  return (
    <Routes>
      {/* Default routes */}
      <Route path="/" element={<HomePageComponent />}>
        <Route index element={<OverviewComponent />} />
        <Route path="overview" element={<OverviewComponent />} />
        <Route path="budgets" element={<Budgets providerErrorsSetter={() => {}} />} />
        <Route path="custom-costs" element={<CustomCostsComponent />} />
        <Route path="business-metrics" element={<SettingsComponent />} />
      </Route>

      {/* Named wallet routes */}
      <Route path="/:name" element={<HomePageComponent />}>
        <Route index element={<OverviewComponent />} />
        <Route path="overview" element={<OverviewComponent />} />
        <Route path="budgets" element={<Budgets providerErrorsSetter={() => {}} />} />
        <Route path="custom-costs" element={<CustomCostsComponent />} />
        <Route path="business-metrics" element={<SettingsComponent />} />
      </Route>
    </Routes>
  );
};
