import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import Input from '@mui/material/Input';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import {
  BarPlot,
  ChartContainer,
  ChartsAxisHighlight,
  ChartsGrid,
  ChartsReferenceLine,
  ChartsTooltip,
  ChartsXAxis,
  ChartsYAxis,
  LineHighlightPlot,
  LinePlot,
  MarkPlot,
  useDrawingArea,
} from '@mui/x-charts';
import { max } from 'lodash';
import moment from 'moment';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { aggregateCostReports, formatCurrency, mergeCostReports } from '../../api/functions';
import { infraWalletApiRef } from '../../api/InfraWalletApi';
import { Budget, Report } from '../../api/types';
import { colorList } from '../constants';
import { getProviderIcon } from '../ProviderIcons';
import { BudgetsProps } from '../types';

const enum BUDGET_VIEW {
  MONTHLY = 'Monthly',
  ANNUAL = 'Annual',
}

const monthList = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Aug',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dec',
};

interface BudgetChartProps {
  provider: string;
  monthlyCosts: Record<string, number>;
  view: string;
}

function BudgetChart(props: Readonly<BudgetChartProps>) {
  const { width, height } = useDrawingArea();
  const theme = useTheme();
  const { provider, monthlyCosts, view } = props;

  const [annualBudget, setAnnualBudget] = useState<Budget | undefined>(undefined);
  const [openManageBudget, setOpenManageBudget] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(false);

  const infraWalletApi = useApi(infraWalletApiRef);

  useEffect(() => {
    const fetchBudget = async () => {
      const response = await infraWalletApi.getBudget('default', provider);
      const updatedBudget = response.data?.find(a => a.provider.toLowerCase() === provider.toLowerCase());
      setAnnualBudget(updatedBudget);
    };

    fetchBudget();
  }, [refreshTrigger, provider, infraWalletApi]);

  const updateBudget = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = annualBudget?.name || `${provider} annual budget`;
    const amount = formData.get('amount');
    const newAnnualBudget: Budget = {
      id: annualBudget?.id,
      provider: provider,
      name: name,
      amount: amount ? Number(amount) : 0,
    };
    await infraWalletApi.updateBudget('default', newAnnualBudget);
    setRefreshTrigger(prev => !prev);
    setOpenManageBudget(false);
  };

  const nonAccumulatedCosts: number[] = [];
  const accumulatedCosts: number[] = [];
  for (const month of Object.keys(monthList).sort((a, b) => Number(a) - Number(b))) {
    const yearMonth = `${moment().year()}-${month}`;

    let cost;
    if (yearMonth in monthlyCosts) {
      cost = monthlyCosts[yearMonth];
    } else if (Number(month) < moment().month()) {
      cost = 0;
    } else {
      break;
    }

    nonAccumulatedCosts.push(cost);
    if (month === '01') {
      accumulatedCosts.push(cost);
    } else {
      accumulatedCosts.push(accumulatedCosts[accumulatedCosts.length - 1] + cost);
    }
  }

  let budgetAmount = annualBudget?.amount || 0;
  if (view === BUDGET_VIEW.MONTHLY) {
    budgetAmount = budgetAmount / 12;
  }

  return (
    <Paper sx={{ padding: 2 }}>
      <ChartContainer
        width={width + 20}
        height={height}
        series={[
          {
            data: view === BUDGET_VIEW.ANNUAL ? accumulatedCosts : nonAccumulatedCosts,
            type: view === BUDGET_VIEW.ANNUAL ? 'line' : 'bar',
            valueFormatter: (value: number | null) => {
              return formatCurrency(value || 0);
            },
            showMark: false,
          },
        ]}
        xAxis={[
          {
            data: Object.entries(monthList)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([_, value]) => value),
            scaleType: 'band',
          },
        ]}
        yAxis={[
          {
            min: 0,
            max:
              view === BUDGET_VIEW.ANNUAL
                ? max([...accumulatedCosts, budgetAmount])
                : max([...nonAccumulatedCosts, budgetAmount]),
            valueFormatter: value => {
              return formatCurrency(value || 0);
            },
            colorMap: {
              type: 'piecewise',
              thresholds: [budgetAmount > 0 ? budgetAmount : Number.MAX_SAFE_INTEGER],
              colors: [colorList[0], theme.palette.error.main],
            },
          },
        ]}
      >
        <ChartsGrid horizontal />
        <ChartsAxisHighlight x={view === BUDGET_VIEW.ANNUAL ? 'line' : 'band'} />
        <LinePlot />
        <BarPlot />
        <MarkPlot />
        <LineHighlightPlot />
        <ChartsReferenceLine
          y={budgetAmount}
          label={budgetAmount ? formatCurrency(budgetAmount) : undefined}
          labelAlign="end"
          lineStyle={{
            stroke: budgetAmount ? theme.palette.error.main : 'transparent',
            strokeDasharray: '5 5',
            strokeWidth: 1.5,
            strokeOpacity: 0.8,
          }}
          labelStyle={{ fill: theme.palette.error.main, fontSize: '0.9em' }}
        />
        <ChartsXAxis />
        <ChartsYAxis />
        <ChartsTooltip />
      </ChartContainer>
      <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
        {getProviderIcon(provider)} {provider}
      </div>
      <div style={{ textAlign: 'center' }}>
        <Button onClick={() => setOpenManageBudget(true)}>Manage budget</Button>
        <Dialog fullWidth maxWidth="sm" open={openManageBudget} onClose={() => setOpenManageBudget(false)}>
          <form onSubmit={updateBudget}>
            <DialogTitle>Manage Budget</DialogTitle>
            <DialogContent>
              <DialogContentText>Please enter your {props.provider} annual budget here.</DialogContentText>
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                {getProviderIcon(provider)}&nbsp;&nbsp;
                <FormControl variant="standard">
                  <InputLabel>Amount</InputLabel>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    startAdornment={<InputAdornment position="start">$</InputAdornment>}
                    defaultValue={annualBudget?.amount}
                  />
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button type="submit" variant="contained">
                Submit
              </Button>
              <Button onClick={() => setOpenManageBudget(false)}>Cancel</Button>
            </DialogActions>
          </form>
        </Dialog>
      </div>
    </Paper>
  );
}

export const Budgets: FC<BudgetsProps> = ({ providerErrorsSetter }) => {
  const [reportsAggregatedAndMerged, setReportsAggregatedAndMerged] = useState<Report[] | undefined>(undefined);
  const [budgetView, setBudgetView] = useState(BUDGET_VIEW.ANNUAL);

  const infraWalletApi = useApi(infraWalletApiRef);
  const alertApi = useApi(alertApiRef);

  const fetchCosts = useCallback(async () => {
    await infraWalletApi
      .getCostReports('', [], '', 'monthly', moment().startOf('y').toDate(), moment().endOf('d').toDate())
      .then(reportsResponse => {
        if (reportsResponse.data) {
          const aggregatedReports = aggregateCostReports(reportsResponse.data, 'provider');
          const aggregatedAndMergedReports = mergeCostReports(aggregatedReports);
          setReportsAggregatedAndMerged(aggregatedAndMergedReports);
        }
        if (reportsResponse.status === 207 && reportsResponse.errors) {
          providerErrorsSetter(reportsResponse.errors);
        }
      })
      .catch(e => alertApi.post({ message: `${e.message}`, severity: 'error' }));
  }, [alertApi, infraWalletApi, providerErrorsSetter]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  return (
    <Grid container spacing={3}>
      <Grid item>
        <Typography variant="h5">
          {moment().year()} {budgetView} Budgets
        </Typography>
      </Grid>
      <Grid container justifyContent="flex-end" spacing={1}>
        <Grid item>Annual</Grid>
        <Grid item>
          <Switch
            size="small"
            onChange={event => setBudgetView(event.target.checked ? BUDGET_VIEW.MONTHLY : BUDGET_VIEW.ANNUAL)}
          />
        </Grid>
        <Grid item>Monthly</Grid>
      </Grid>
      {reportsAggregatedAndMerged !== undefined ? (
        reportsAggregatedAndMerged.map(report => (
          <Grid item key={`${report.id}-grid`} xs={4}>
            <BudgetChart provider={report.id} monthlyCosts={report.reports} view={budgetView} />
          </Grid>
        ))
      ) : (
        <Grid item xs={12}>
          <Paper
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: 500,
              backgroundColor: 'transparent',
              boxShadow: 'none',
            }}
          >
            <div style={{ width: '60%', margin: 'auto' }}>
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
};
