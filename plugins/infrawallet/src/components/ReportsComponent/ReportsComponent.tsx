import { Content, Header, Page, Progress } from '@backstage/core-components';
import { alertApiRef, configApiRef, useApi } from '@backstage/core-plugin-api';
import { Chip, Grid } from '@material-ui/core';
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { infraWalletApiRef } from '../../api/InfraWalletApi';
import {
  aggregateCostReports,
  filterCostReports,
  getAllReportTags,
  getPeriodStrings,
  mergeCostReports,
} from '../../api/functions';
import { CloudProviderError, Filters, Metric, Report, Tag } from '../../api/types';
import { ColumnsChartComponent } from '../ColumnsChartComponent';
import { CostReportsTableComponent } from '../CostReportsTableComponent';
import { ErrorsAlertComponent } from '../ErrorsAlertComponent';
import { FiltersComponent } from '../FiltersComponent';
import { PieChartComponent } from '../PieChartComponent';
import { TopbarComponent } from '../TopbarComponent';
import { MonthRange } from '../types';

export interface ReportsComponentProps {
  title?: string;
  subTitle?: string;
}

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

const checkIfFiltersActivated = (filters: Filters): boolean => {
  let activated = false;
  Object.keys(filters).forEach((key: string) => {
    if (filters[key].length > 0) {
      activated = true;
    }
  });
  return activated;
};

export const ReportsComponent = (props: ReportsComponentProps) => {
  const { title, subTitle } = props;
  const configApi = useApi(configApiRef);
  const params = useParams();

  let defaultGroupBy = configApi.getOptionalString('infraWallet.settings.defaultGroupBy') ?? 'none';
  // "name" is renamed to "account", make it backward compatibility
  if (defaultGroupBy === 'name') {
    defaultGroupBy = 'account';
  }

  const defaultShowLastXMonths = configApi.getOptionalNumber('infraWallet.settings.defaultShowLastXMonths') ?? 3;

  const MERGE_THRESHOLD = 8;
  const [submittingState, setSubmittingState] = useState<boolean>(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [cloudProviderErrors, setCloudProviderErrors] = useState<CloudProviderError[]>([]);
  const [reportsAggregated, setReportsAggregated] = useState<Report[]>([]);
  const [reportsAggregatedAndMerged, setReportsAggregatedAndMerged] = useState<Report[]>([]);
  const [reportTags, setReportTags] = useState<string[]>([]);
  const [granularity, setGranularity] = useState<string>('monthly');
  const [aggregatedBy, setAggregatedBy] = useState<string>(defaultGroupBy);
  const [groups] = useState<string>('');
  const [monthRange, setMonthRange] = useState<MonthRange>({
    startMonth: startOfMonth(addMonths(new Date(), defaultShowLastXMonths * -1 + 1)),
    endMonth: endOfMonth(new Date()),
  });
  const [periods, setPeriods] = useState<string[]>([]);

  const alertApi = useApi(alertApiRef);
  const infraWalletApi = useApi(infraWalletApiRef);

  const fetchCostReportsCallback = useCallback(async () => {
    setSubmittingState(true);
    await infraWalletApi
      .getCostReports('', selectedTags, groups, granularity, monthRange.startMonth, monthRange.endMonth)
      .then(reportsResponse => {
        if (reportsResponse.data && reportsResponse.data.length > 0) {
          setReports(reportsResponse.data);
          setPeriods(getPeriodStrings(granularity, monthRange.startMonth, monthRange.endMonth));
        }
        if (reportsResponse.status === 207 && reportsResponse.errors) {
          setCloudProviderErrors(reportsResponse.errors);
        }
      })
      .catch(e => alertApi.post({ message: `${e.message}`, severity: 'error' }));
    setSubmittingState(false);
  }, [groups, monthRange, granularity, selectedTags, infraWalletApi, alertApi]);

  const fetchMetricsCallback = useCallback(async () => {
    await infraWalletApi
      .getMetrics(params.name ?? 'default', granularity, monthRange.startMonth, monthRange.endMonth)
      .then(metricsResponse => {
        if (metricsResponse.data && metricsResponse.data.length > 0) {
          setMetrics(metricsResponse.data);
        }
        if (metricsResponse.status === 207 && metricsResponse.errors) {
          setCloudProviderErrors(metricsResponse.errors);
        }
      })
      .catch(e => alertApi.post({ message: `${e.message}`, severity: 'error' }));
  }, [params.name, monthRange, granularity, infraWalletApi, alertApi]);

  useEffect(() => {
    if (reports.length !== 0) {
      const filteredReports = filterCostReports(reports, filters);
      const aggregatedReports = aggregateCostReports(filteredReports, aggregatedBy);
      const aggregatedAndMergedReports = mergeCostReports(aggregatedReports, MERGE_THRESHOLD);
      const allTags = getAllReportTags(reports);
      setReportsAggregated(aggregatedReports);
      setReportsAggregatedAndMerged(aggregatedAndMergedReports);
      setReportTags(allTags);
    }
  }, [filters, reports, aggregatedBy, granularity, monthRange]);

  useEffect(() => {
    fetchCostReportsCallback();
    fetchMetricsCallback();
  }, [fetchCostReportsCallback, fetchMetricsCallback]);

  return (
    <Page themeId="tool">
      <Header title={title ?? 'InfraWallet'} subtitle={subTitle ?? ''} />
      <Content>
        {submittingState ? <Progress /> : null}
        <Grid container spacing={3}>
          {cloudProviderErrors.length > 0 && (
            <Grid item xs={12}>
              <ErrorsAlertComponent errors={cloudProviderErrors} />
            </Grid>
          )}
          <Grid item xs={12}>
            <TopbarComponent
              aggregatedBy={aggregatedBy}
              aggregatedBySetter={setAggregatedBy}
              tags={reportTags}
              monthRange={monthRange}
              monthRangeSetter={setMonthRange}
            />
          </Grid>
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="filters-content" id="filters-header">
                <Typography>
                  Filters {checkIfFiltersActivated(filters) && <Chip size="small" label="active" color="primary" />}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FiltersComponent
                  reports={reports}
                  filters={filters}
                  monthRange={monthRange}
                  filtersSetter={setFilters}
                  selectedTagsSetter={setSelectedTags}
                  providerErrorsSetter={setCloudProviderErrors}
                />
              </AccordionDetails>
            </Accordion>
          </Grid>
          <Grid item xs={12} md={4} lg={3}>
            {reportsAggregatedAndMerged.length > 0 && (
              <PieChartComponent
                categories={reportsAggregatedAndMerged.map((item: any) => item.id)}
                series={reportsAggregatedAndMerged.map((item: any) => getTotalCost(item))}
                height={350}
              />
            )}
          </Grid>
          <Grid item xs={12} md={8} lg={9}>
            {reportsAggregatedAndMerged.length > 0 && (
              <ColumnsChartComponent
                granularitySetter={setGranularity}
                categories={periods}
                series={reportsAggregatedAndMerged.map((item: any) => ({
                  name: item.id,
                  type: 'column',
                  data: rearrangeData(item, periods),
                }))}
                metrics={metrics.map((item: any) => ({
                  name: item.id,
                  group: item.yaxis_group,
                  type: 'line',
                  data: rearrangeData(item, periods),
                }))}
                height={350}
              />
            )}
          </Grid>
          <Grid item xs={12}>
            {reportsAggregated.length > 0 && (
              <CostReportsTableComponent reports={reportsAggregated} aggregatedBy={aggregatedBy} periods={periods} />
            )}
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
