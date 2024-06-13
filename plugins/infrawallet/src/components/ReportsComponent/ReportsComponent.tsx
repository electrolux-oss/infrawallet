import {
  Content,
  Header,
  Page,
  Progress,
} from '@backstage/core-components';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { Grid } from '@material-ui/core';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import React, { useCallback, useEffect, useState } from 'react';
import { infraWalletApiRef } from '../../api/InfraWalletApi';
import {
  aggregateCostReports,
  mergeCostReports,
  getAllReportTags,
} from '../../api/functions';
import { Report } from '../../api/types';
import { ColumnsChartComponent } from '../ColumnsChartComponent';
import { CostReportsTableComponent } from '../CostReportsTableComponent';
import { PieChartComponent } from '../PieChartComponent';
import { TopbarComponent } from '../TopbarComponent';
import { MonthRange } from '../types';

const getTotalCost = (report: Report): number => {
  let total = 0;
  Object.keys(report.reports).forEach((s: string) => {
    total += report.reports[s];
  });
  return total;
};

const rearrangeData = (report: Report, periods: string[]): any[] => {
  const costs: any[] = [];
  periods.forEach((s: string) => {
    if (report.reports[s] !== undefined) {
      costs.push(report.reports[s]);
    } else {
      costs.push(null);
    }
  });
  return costs;
};

export const ReportsComponent = () => {
  const MERGE_THRESHOLD = 8;
  const [submittingState, setSubmittingState] = useState<Boolean>(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsAggregated, setReportsAggregated] = useState<Report[]>([]);
  const [reportsAggregatedAndMerged, setReportsAggregatedAndMerged] = useState<
    Report[]
  >([]);
  const [reportTags, setReportTags] = useState<string[]>([]);
  const [granularity, setGranularity] = useState<string>('monthly');
  const [aggregatedBy, setAggregatedBy] = useState<string>('none');
  const [filters, _setFilters] = useState<string>('');
  const [groups, _setGroups] = useState<string>('');
  const [monthRangeState, setMonthRangeState] = React.useState<MonthRange>({
    startMonth: startOfMonth(addMonths(new Date(), -2)),
    endMonth: endOfMonth(new Date()),
  });

  const alertApi = useApi(alertApiRef);
  const infraWalletApi = useApi(infraWalletApiRef);

  const fetchCostReportsCallback = useCallback(async () => {
    setSubmittingState(true);
    await infraWalletApi
      .getCostReports(
        filters,
        groups,
        granularity,
        monthRangeState.startMonth,
        monthRangeState.endMonth,
      )
      .then(reportsResponse => {
        if (reportsResponse.data && reportsResponse.data.length > 0) {
          setReports(reportsResponse.data);
        }
      })
      .catch(e =>
        alertApi.post({ message: `${e.message}`, severity: 'error' }),
      );
    setSubmittingState(false);
  }, [filters, groups, monthRangeState, granularity, infraWalletApi, alertApi]);

  useEffect(() => {
    if (reports.length !== 0) {
      const arrgegatedReports = aggregateCostReports(reports, aggregatedBy);
      const aggregatedAndMergedReports = mergeCostReports(
        arrgegatedReports,
        MERGE_THRESHOLD,
      );
      const allTags = getAllReportTags(reports);
      setReportsAggregated(arrgegatedReports);
      setReportsAggregatedAndMerged(aggregatedAndMergedReports);
      setReportTags(allTags);
    }
  }, [reports, aggregatedBy]);

  useEffect(() => {
    fetchCostReportsCallback();
  }, [fetchCostReportsCallback]);

  return (
    <Page themeId="tool">
      <Header title="InfraWallet" />
      <Content>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TopbarComponent
              aggregatedBy={aggregatedBy}
              aggregatedBySetter={setAggregatedBy}
              tags={reportTags}
              granularity={granularity}
              granularitySetter={setGranularity}
              monthRange={monthRangeState}
              monthRangeSetter={setMonthRangeState}
            />
          </Grid>
          <Grid item xs={12}>
            {submittingState ? <Progress /> : null}
          </Grid>
          <Grid item xs={12} md={4} lg={3}>
            {reportsAggregatedAndMerged.length > 0 && (
              <PieChartComponent
                categories={reportsAggregatedAndMerged.map(
                  (item: any) => item.id,
                )}
                series={reportsAggregatedAndMerged.map((item: any) =>
                  getTotalCost(item),
                )}
                height={350}
              />
            )}
          </Grid>
          <Grid item xs={12} md={8} lg={9}>
            {reportsAggregatedAndMerged.length > 0 && (
              <ColumnsChartComponent
                categories={Object.keys(reportsAggregatedAndMerged[0].reports)}
                series={reportsAggregatedAndMerged.map((item: any) => ({
                  name: item.id,
                  data: rearrangeData(
                    item,
                    Object.keys(reportsAggregatedAndMerged[0].reports),
                  ),
                }))}
                height={350}
              />
            )}
          </Grid>
          <Grid item xs={12}>
            {reportsAggregated.length > 0 && (
              <CostReportsTableComponent
                reports={reportsAggregated}
                aggregatedBy={aggregatedBy}
              />
            )}
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
