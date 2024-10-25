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
import {
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
import { getProviderIcon } from '../ProviderIcons';
import { BudgetsProps } from '../types';

interface BudgetChartProps {
  provider: string;
  costs: number[];
}

function BudgetChart(props: Readonly<BudgetChartProps>) {
  const { width, height } = useDrawingArea();
  const theme = useTheme();
  const provider = props.provider;

  const [budget, setBudget] = useState<Budget | undefined>(undefined);
  const [openManageBudget, setOpenManageBudget] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(false);

  const infraWalletApi = useApi(infraWalletApiRef);

  useEffect(() => {
    const fetchBudget = async () => {
      const response = await infraWalletApi.getBudget('default', provider);
      const updatedBudget = response.data?.find(a => a.provider.toLowerCase() === provider.toLowerCase());
      setBudget(updatedBudget);
    };

    fetchBudget();
  }, [refreshTrigger, provider, infraWalletApi]);

  const updateBudget = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = budget?.name || `${provider} annual budget`;
    const amount = formData.get('amount');
    const newBudget: Budget = {
      id: budget?.id,
      provider: provider,
      name: name,
      amount: amount ? Number(amount) : 0,
    };
    await infraWalletApi.updateBudget('default', newBudget);
    setRefreshTrigger(prev => !prev);
    setOpenManageBudget(false);
  };

  const accumulatedCosts: number[] = [];
  for (let i = 0; i < props.costs.length; i++) {
    if (i === 0) {
      accumulatedCosts[i] = props.costs[i];
    } else {
      accumulatedCosts[i] = accumulatedCosts[i - 1] + props.costs[i];
    }
  }

  return (
    <Paper sx={{ padding: 2 }}>
      <ChartContainer
        width={width + 20}
        height={height}
        series={[
          {
            data: accumulatedCosts,
            type: 'line',
            valueFormatter: value => {
              return formatCurrency(value || 0);
            },
            showMark: false,
          },
        ]}
        xAxis={[
          {
            data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            scaleType: 'band',
          },
        ]}
        yAxis={[
          {
            min: 0,
            max: max([...accumulatedCosts, budget?.amount]),
            valueFormatter: value => {
              return formatCurrency(value || 0);
            },
          },
        ]}
      >
        <ChartsGrid horizontal />
        <ChartsAxisHighlight x="line" />
        <LinePlot />
        <MarkPlot />
        <LineHighlightPlot />
        <ChartsReferenceLine
          y={budget?.amount || 0}
          label={budget?.amount ? formatCurrency(budget.amount) : 'no budget set'}
          labelAlign="end"
          lineStyle={{
            stroke: budget?.amount ? theme.palette.error.main : 'transparent',
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
      <div style={{ textAlign: 'center', fontWeight: 'bold' }}>{getProviderIcon(provider)} {provider}</div>
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
                    defaultValue={budget?.amount}
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
      {reportsAggregatedAndMerged !== undefined ? (
        reportsAggregatedAndMerged.map(report => (
          <Grid item key={`${report.id}-grid`} xs={4}>
            <BudgetChart provider={report.id} costs={Object.values(report.reports)} />
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
