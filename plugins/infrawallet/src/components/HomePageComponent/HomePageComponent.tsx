import { Content, Header, HeaderTabs, Page } from '@backstage/core-components';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { default as React, useEffect } from 'react';
import { useLocation, useNavigate, useParams, Outlet } from 'react-router-dom';
import { HomePageComponentProps } from '../types';

export const HomePageComponent = (props: HomePageComponentProps) => {
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

  // Determine active tab based on URL path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentTabId = pathSegments[pathSegments.length - 1] || 'overview';
  const currentTab = tabsToShow.find(tab => tab.id === currentTabId) || tabsToShow[0];
  const activeTabIndex = tabsToShow.indexOf(currentTab);

  // Save params for overview in sessionStorage on tab change
  useEffect(() => {
    if (currentTabId === 'overview') {
      sessionStorage.setItem('overviewParams', location.search || '');
    }
  }, [currentTabId, location.search]);

  const handleTabChange = (index: number) => {
    const tab = tabsToShow[index];
    const basePath = params.name ? `/infrawallet/${params.name}` : '/infrawallet';
    let newPath = tab.id === 'overview' ? basePath : `${basePath}/${tab.id}`;

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
