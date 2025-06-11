import { default as React } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ReportsComponent, ReportsComponentProps } from './ReportsComponent';

export const Router = (props: ReportsComponentProps) => {
  return (
    <Routes>
      <Route path="/" element={<ReportsComponent {...props} />} />
      <Route path="/:name" element={<ReportsComponent {...props} />} />
      <Route path="/:name/:selectedView" element={<ReportsComponent {...props} />} />
    </Routes>
  );
};
