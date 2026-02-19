import { Content, Header, HeaderTabs, Page } from '@backstage/core-components';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import React, { useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { HomePageProps } from '../types';

export const HomePage = (props: HomePageProps) => {
  const { title, subTitle } = props;
  const configApi = useApi(configApiRef);
  const location = useLocation();
  const navigate = useNavigate();

  const budgetsEnabled = configApi.getOptionalBoolean('infraWallet.settings.budgets.enabled') ?? true;
  const customCostsEnabled = configApi.getOptionalBoolean('infraWallet.settings.customCosts.enabled') ?? true;
  const businessMetricsEnabled = configApi.getOptionalBoolean('infraWallet.settings.businessMetrics.enabled') ?? true;
  const overviewTab = 'overview';
  const tabConfig = [
    { id: overviewTab, label: 'Overview', enabled: true },
    { id: 'budgets', label: 'Budgets', enabled: budgetsEnabled },
    { id: 'custom-costs', label: 'Custom Costs', enabled: customCostsEnabled },
    { id: 'business-metrics', label: 'Business Metrics', enabled: businessMetricsEnabled },
  ];
  const activeTabs = tabConfig.filter(tab => tab.enabled);
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const tabSegment = pathSegments[1];
  const activeTabIndex = activeTabs.findIndex(tab => tab.id === tabSegment);
  const handleTabChange = (index: number) => {
    const tab = activeTabs[index];
    let newPath = `${tab.id}`;
    if (tab.id === overviewTab) {
      const savedParams = sessionStorage.getItem('overviewParams');
      if (savedParams) {
        newPath += savedParams;
      }
    }

    navigate(newPath);
  };

  useEffect(() => {
    if (tabSegment === overviewTab && location.search) {
      sessionStorage.setItem('overviewParams', location.search);
    }
  }, [tabSegment, location.search, overviewTab]);

  useEffect(() => {
    if (activeTabIndex === -1) {
      navigate(overviewTab, { replace: true });
    }
  }, [activeTabIndex, overviewTab, navigate]);

  return (
    <Page themeId="tool">
      <Header title={title ?? 'InfraWallet'} subtitle={subTitle ?? ''} />
      <HeaderTabs
        tabs={activeTabs.map(tab => ({ id: tab.id, label: tab.label }))}
        onChange={handleTabChange}
        selectedIndex={activeTabIndex}
      />
      <Content>
        <Outlet />
      </Content>
    </Page>
  );
};
