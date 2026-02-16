import { Content, Header, HeaderTabs, Page } from '@backstage/core-components';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import React, { useEffect } from 'react';
import { useLocation, useNavigate, useParams, Outlet } from 'react-router-dom';
import { HomePageProps } from '../types';

export const HomePage = (props: HomePageProps) => {
  const { title, subTitle } = props;
  const configApi = useApi(configApiRef);
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const budgetsEnabled = configApi.getOptionalBoolean('infraWallet.settings.budgets.enabled') ?? true;
  const customCostsEnabled = configApi.getOptionalBoolean('infraWallet.settings.customCosts.enabled') ?? true;
  const businessMetricsEnabled = configApi.getOptionalBoolean('infraWallet.settings.businessMetrics.enabled') ?? true;

  const tabConfig = [
    { id: 'overview', label: 'Overview', enabled: true },
    { id: 'budgets', label: 'Budgets', enabled: budgetsEnabled },
    { id: 'custom-costs', label: 'Custom Costs', enabled: customCostsEnabled },
    { id: 'business-metrics', label: 'Business Metrics', enabled: businessMetricsEnabled },
  ];
  const tabsToShow = tabConfig.filter(tab => tab.enabled);

  // Determine active tab based on URL path (handles nested paths like /budgets/xxx)
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const tabIds = new Set(tabsToShow.map(tab => tab.id));
  const currentTabId = pathSegments.find(segment => tabIds.has(segment)) || 'overview';
  const currentTab = tabsToShow.find(tab => tab.id === currentTabId) || tabsToShow[0];
  const activeTabIndex = tabsToShow.indexOf(currentTab);
  const INFRAWALLET_BASE = '/infrawallet';
  const basePath = params.name ? `${INFRAWALLET_BASE}/${params.name}` : INFRAWALLET_BASE;

  // Save params for overview in sessionStorage on tab change
  useEffect(() => {
    if (currentTabId === 'overview') {
      sessionStorage.setItem('overviewParams', location.search || '');
    }
  }, [currentTabId, location.search]);

  useEffect(() => {
    let normalizedPath = location.pathname;
    while (normalizedPath.endsWith('/') && normalizedPath !== '/') {
      normalizedPath = normalizedPath.slice(0, -1);
    }
    if (normalizedPath === basePath) {
      navigate(`${basePath}/overview${location.search || ''}`, { replace: true });
    }
  }, [basePath, location.pathname, location.search, navigate]);

  const handleTabChange = (index: number) => {
    const tab = tabsToShow[index];
    let newPath = tab.id === 'overview' ? `${basePath}/overview` : `${basePath}/${tab.id}`;

    if (tab.id === 'overview') {
      const savedParams = sessionStorage.getItem('overviewParams');
      if (savedParams) {
        newPath += savedParams;
      }
    }

    navigate(newPath);
  };

  return (
    <Page themeId="tool">
      <Header title={title ?? 'InfraWallet'} subtitle={subTitle ?? ''} />
      <HeaderTabs
        tabs={tabsToShow.map(tab => ({ id: tab.id, label: tab.label }))}
        selectedIndex={activeTabIndex}
        onChange={handleTabChange}
      />
      <Content>
        <Outlet />
      </Content>
    </Page>
  );
};
