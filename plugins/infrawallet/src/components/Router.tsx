import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ReportsComponent, ReportsComponentProps } from './ReportsComponent';

export const Router = (props: ReportsComponentProps) => {
  return (
    <Routes>
      <Route path="/" element={<ReportsComponent {...props} />} />
      <Route path="/:name" element={<ReportsComponent {...props} />} />
    </Routes>
  );
};
