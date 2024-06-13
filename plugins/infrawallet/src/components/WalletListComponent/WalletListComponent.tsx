import {
  Content,
  Header, 
  InfoCard,
  Page
} from '@backstage/core-components';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { Grid, Typography } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import React, { useCallback, useEffect, useState } from 'react';
import { Range } from 'react-date-range';
import { infraWalletApiRef } from '../../api/InfraWalletApi';
import { Report } from '../../api/types';
import { ColumnsChartComponent } from '../ColumnsChartComponent';

const rearrangeData = (reportDetails: any, yearmonths: string[]): any[] => {
  const arrCost: any[] = [];
  yearmonths.forEach((s: string) => {
    if (reportDetails.reports[s] !== undefined) {
      arrCost.push(reportDetails.reports[s]);
    } else {
      arrCost.push(null);
    }
  });
  return arrCost;
};

const calcualateTotalCosts = (reports: Report[]): string => {
  let total = 0;
  reports.forEach(report => {
    Object.keys(report.reports).forEach(key => {
      total += report.reports[key];
    });
  });
  return total.toFixed(2);
};

export const WalletListComponent = () => {
  const [_submittingState, setSubmittingState] = useState<Boolean>(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [granularity, _setGranularity] = useState<string>('monthly');
  const [filters, _setFilters] = useState<string>('');
  const [groups, _setGroups] = useState<string>('');
  const [dateRangeState, _setDateRangeState] = React.useState<Range[]>([
    {
      startDate: startOfMonth(addMonths(new Date(), -11)),
      endDate: endOfMonth(new Date()),
      key: 'selection',
    },
  ]);

  const alertApi = useApi(alertApiRef);
  const infraWalletApi = useApi(infraWalletApiRef);

  const fetchCostReportsCallback = useCallback(async () => {
    setReports([]);
    setSubmittingState(true);
    await infraWalletApi
      .getCostReports(
        filters,
        groups,
        granularity,
        dateRangeState[0].startDate as Date,
        dateRangeState[0].endDate as Date,
      )
      .then(reportsResponse => {
        setSubmittingState(false);
        if (reportsResponse.data && reportsResponse.data.length > 0) {
          setReports(reportsResponse.data);
        }
      })
      .catch(e =>
        alertApi.post({ message: `${e.message}`, severity: 'error' }),
      );
  }, [filters, groups, granularity, dateRangeState, infraWalletApi, alertApi]);

  useEffect(() => {
    fetchCostReportsCallback();
  }, [fetchCostReportsCallback]);

  return (
    <Page themeId="tool">
      <Header title="InfraWallet" />
      <Content>
        <Grid container spacing={3}>
          <Grid item xs={3}>
            <InfoCard title="Default Wallet">
              {reports.length > 0 && (
                <ColumnsChartComponent
                  categories={Object.keys(reports[0].reports)}
                  series={reports.map((item: any) => ({
                    name: item.id,
                    data: rearrangeData(item, Object.keys(reports[0].reports)),
                  }))}
                  height={150}
                  thumbnail
                />
              )}
              <Typography variant="body1">Everything.</Typography>
              <Typography variant="body1">
                Total cost of the last 12 months: $
                {calcualateTotalCosts(reports)}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                href="/infrawallet/reports"
                target="_blank"
              >
                Open
              </Button>
            </InfoCard>
          </Grid>
          <Grid item xs={3}>
            <InfoCard title="Delta Wallet">
              {reports.length > 0 && (
                <ColumnsChartComponent
                  categories={Object.keys(reports[0].reports)}
                  series={reports.map((item: any) => ({
                    name: item.id,
                    data: rearrangeData(item, Object.keys(reports[0].reports)),
                  }))}
                  height={150}
                  thumbnail
                />
              )}
              <Typography variant="body1">Delta project costs.</Typography>
              <Typography variant="body1">
                Total cost of the last 12 months: $
                {calcualateTotalCosts(reports)}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                href="/infrawallet/reports"
                target="_blank"
              >
                Open
              </Button>
            </InfoCard>
          </Grid>
          <Grid item xs={3}>
            <InfoCard title="OCP Wallet">
              {reports.length > 0 && (
                <ColumnsChartComponent
                  categories={Object.keys(reports[0].reports)}
                  series={reports.map((item: any) => ({
                    name: item.id,
                    data: rearrangeData(item, Object.keys(reports[0].reports)),
                  }))}
                  height={150}
                  thumbnail
                />
              )}
              <Typography variant="body1">OCP project costs.</Typography>
              <Typography variant="body1">
                Total cost of the last 12 months: $
                {calcualateTotalCosts(reports)}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                href="/infrawallet/reports"
                target="_blank"
              >
                Open
              </Button>
            </InfoCard>
          </Grid>
          <Grid item xs={3}>
            <InfoCard title="Azure Wallet">
              {reports.length > 0 && (
                <ColumnsChartComponent
                  categories={Object.keys(reports[0].reports)}
                  series={reports.map((item: any) => ({
                    name: item.id,
                    data: rearrangeData(item, Object.keys(reports[0].reports)),
                  }))}
                  height={150}
                  thumbnail
                />
              )}
              <Typography variant="body1">Azure cloud costs.</Typography>
              <Typography variant="body1">
                Total cost of the last 12 months: $
                {calcualateTotalCosts(reports)}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                href="/infrawallet/reports"
                target="_blank"
              >
                Open
              </Button>
            </InfoCard>
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
