import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import Grid from '@mui/material/Grid';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { infraWalletApiRef } from '../../api/InfraWalletApi';
import { Wallet } from '../../api/types';
import { MetricConfigurationComponent } from '../MetricConfigurationComponent';

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
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <MetricConfigurationComponent wallet={wallet} />
      </Grid>
    </Grid>
  );
};
