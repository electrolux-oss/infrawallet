import { Content, Header, Page } from '@backstage/core-components';
import React, { useCallback, useEffect, useState } from 'react';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { infraWalletApiRef } from '../../api/InfraWalletApi';
import { Grid } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { useParams } from 'react-router-dom';
import { MetricConfigurationComponent } from '../MetricConfigurationComponent';
import { Wallet } from '../../api/types';

export const SettingsComponent = () => {
  const params = useParams();
  const alertApi = useApi(alertApiRef);
  const infraWalletApi = useApi(infraWalletApiRef);
  const [wallet, setWallet] = useState<Wallet>();

  const getWalletInfo = useCallback(async () => {
    await infraWalletApi
      .getWalletByName(params.name ?? 'default')
      .then(getWalletResponse => {
        if (getWalletResponse.data && getWalletResponse.status === 200) {
          setWallet(getWalletResponse.data);
        }
      })
      .catch(e => alertApi.post({ message: `${e.message}`, severity: 'error' }));
  }, [params.name, infraWalletApi, alertApi]);

  useEffect(() => {
    getWalletInfo();
  }, [getWalletInfo]);

  return (
    <Page themeId="tool">
      <Header title="Wallet Settings Page (Alpha)" />
      <Content>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="info">
              For now, this page only supports configuring business metrics for the default wallet.
            </Alert>
          </Grid>
          <Grid item xs={12}>
            <MetricConfigurationComponent wallet={wallet} />
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
