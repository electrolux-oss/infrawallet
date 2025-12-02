import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
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
  ResponsiveChartContainer,
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
import {
  aggregateCostReports,
  formatCurrency,
  mergeCostReports,
  calculateBudgetAnalytics,
  BudgetAnalytics,
} from '../../api/functions';
import { infraWalletApiRef } from '../../api/InfraWalletApi';
import { Budget, Report } from '../../api/types';
import { colorList } from '../constants';
import { ProviderIcon } from '../ProviderIcon';
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

interface BudgetHealthIndicatorProps {
  status: 'healthy' | 'warning' | 'critical';
  utilizationPercent: number;
}

function BudgetHealthIndicator({ status, utilizationPercent }: BudgetHealthIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return '#4caf50';
      case 'warning':
        return '#ff9800';
      case 'critical':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'healthy':
        return 'On Track';
      case 'warning':
        return 'At Risk';
      case 'critical':
        return 'Over Budget';
      default:
        return 'Unknown';
    }
  };

  return (
    <Chip
      label={`${getStatusLabel()} (${utilizationPercent.toFixed(1)}%)`}
      size="small"
      sx={{
        backgroundColor: getStatusColor(),
        color: 'white',
        fontWeight: 'bold',
        '& .MuiChip-label': { fontWeight: 'bold' },
      }}
    />
  );
}

interface BudgetChartProps {
  provider: string;
  monthlyCosts: Record<string, number>;
  view: string;
  budgets: Budget[];
  setBudgets: React.Dispatch<React.SetStateAction<Budget[]>>;
}

function getSpendingVelocityColor(velocity: number) {
  if (velocity > 10) return 'error';
  if (velocity < -10) return 'success.main';
  return 'textSecondary';
}

function getSpendingVelocityIcon(velocity: number) {
  if (velocity > 0) return '↑';
  if (velocity < 0) return '↓';
  return '→';
}

function getRecommendationColor(type: string) {
  if (type === 'critical') return 'error';
  if (type === 'warning') return 'warning';
  return 'info';
}

function BudgetChart(props: Readonly<BudgetChartProps>) {
  const { height } = useDrawingArea();
  const theme = useTheme();
  const { provider, monthlyCosts, view, budgets, setBudgets } = props;
  const infraWalletApi = useApi(infraWalletApiRef);

  const annualBudget = budgets.find(b => b.provider.toLowerCase() === provider.toLowerCase());
  const annualBudgetAmount = annualBudget?.amount || 0;

  const [openManageBudget, setOpenManageBudget] = useState(false);

  const budgetAnalytics: BudgetAnalytics = calculateBudgetAnalytics(monthlyCosts, annualBudgetAmount);

  const updateBudget = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get('amount') || 0);
    const updated: Budget = {
      id: annualBudget?.id,
      provider: provider,
      name: annualBudget?.name || `${provider} annual budget`,
      amount: amount,
    };
    await infraWalletApi.updateBudget('default', updated);
    setBudgets(prev => {
      const index = prev.findIndex(b => b.provider.toLowerCase() === provider.toLowerCase());
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = { ...copy[index], ...updated };
        return copy;
      }
      return [...prev, updated];
    });
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

  let budgetAmount = annualBudgetAmount;

  let chartSeries: any[];
  let yAxis: any[];

  if (view === BUDGET_VIEW.MONTHLY) {
    budgetAmount = budgetAmount / 12;

    const lastIndex = nonAccumulatedCosts.length - 1;
    const lastActualCost = lastIndex >= 0 ? nonAccumulatedCosts[lastIndex] : 0;
    const projectedCurrentMonthCost = budgetAnalytics.projectedCurrentMonthCost;
    const projectedDelta = projectedCurrentMonthCost - lastActualCost;
    const monthlyMax = max([...nonAccumulatedCosts, budgetAmount]) || 0;

    chartSeries = [
      {
        id: 'actual-spend',
        yAxisKey: 'spendAxis',
        data: nonAccumulatedCosts,
        type: 'bar',
        stack: 'combined',
        label: 'Actual Spend',
        color: colorList[0],
        valueFormatter: (value: number | null) => formatCurrency(value || 0),
      },
    ];

    if (lastIndex >= 0 && projectedDelta > 0) {
      const deltaData = nonAccumulatedCosts.map((_, i) => (i === lastIndex ? projectedDelta : 0));

      chartSeries.push({
        id: 'projected-delta',
        yAxisKey: 'deltaAxis',
        data: deltaData,
        type: 'bar',
        stack: 'combined',
        label: 'Projected Delta',
        color: theme.palette.warning.main,
        valueFormatter: (value: number | null) => {
          if (value === 0) return null;
          return formatCurrency(value || 0);
        },
      });
    }

    yAxis = [
      {
        id: 'spendAxis',
        min: 0,
        max: monthlyMax,
        valueFormatter: (value: number | null) => formatCurrency(value || 0),
        colorMap: {
          type: 'piecewise',
          thresholds: [budgetAmount > 0 ? budgetAmount : Number.MAX_SAFE_INTEGER],
          colors: [colorList[0], theme.palette.error.main],
        },
      },
      {
        id: 'deltaAxis',
        min: 0,
        max: monthlyMax,
      },
    ];
  } else {
    chartSeries = [
      {
        id: 'yearAxis',
        yAxisKey: 'spendAxis',
        data: accumulatedCosts,
        type: 'line',
        showMark: false,
        valueFormatter: (value: number | null) => formatCurrency(value || 0),
      },
    ];

    yAxis = [
      {
        id: 'spendAxis',
        min: 0,
        max: max([...accumulatedCosts, budgetAmount, budgetAnalytics.confidenceRange.high]),
        valueFormatter: (value: number | null) => formatCurrency(value || 0),
        colorMap: {
          type: 'piecewise',
          thresholds: [budgetAmount > 0 ? budgetAmount : Number.MAX_SAFE_INTEGER],
          colors: [colorList[0], theme.palette.error.main],
        },
      },
    ];
  }

  return (
    <Paper sx={{ padding: 2 }}>
      {/* Budget Health Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ProviderIcon provider={provider} />
          <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
            {provider}
          </Typography>
        </Box>
        {annualBudgetAmount > 0 && (
          <BudgetHealthIndicator
            status={budgetAnalytics.budgetHealthStatus}
            utilizationPercent={budgetAnalytics.budgetUtilizationPercent}
          />
        )}
      </Box>

      {/* Budget Metrics Cards */}
      {annualBudgetAmount > 0 && (
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Card variant="outlined" sx={{ textAlign: 'center' }}>
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Typography variant="caption" color="textSecondary">
                  YTD Spent
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatCurrency(budgetAnalytics.yearToDateSpent)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  of {formatCurrency(annualBudgetAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card variant="outlined" sx={{ textAlign: 'center' }}>
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Typography variant="caption" color="textSecondary">
                  Projected Annual
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  color={budgetAnalytics.projectedAnnualSpending > annualBudgetAmount ? 'error' : 'inherit'}
                >
                  {formatCurrency(budgetAnalytics.projectedAnnualSpending)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {budgetAnalytics.projectedAnnualSpending > annualBudgetAmount
                    ? `+${formatCurrency(budgetAnalytics.projectedAnnualSpending - annualBudgetAmount)} over`
                    : `${formatCurrency(annualBudgetAmount - budgetAnalytics.projectedAnnualSpending)} under`}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card variant="outlined" sx={{ textAlign: 'center' }}>
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Typography variant="caption" color="textSecondary">
                  Monthly Run Rate
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatCurrency(budgetAnalytics.monthlyRunRate)}
                </Typography>
                <Typography variant="caption" color={getSpendingVelocityColor(budgetAnalytics.spendingVelocity)}>
                  {getSpendingVelocityIcon(budgetAnalytics.spendingVelocity)}
                  {Math.abs(budgetAnalytics.spendingVelocity).toFixed(1)}% MoM
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card variant="outlined" sx={{ textAlign: 'center' }}>
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Typography variant="caption" color="textSecondary">
                  Target Monthly
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  color={
                    budgetAnalytics.targetMonthlySpending < budgetAnalytics.monthlyRunRate ? 'error' : 'success.main'
                  }
                >
                  {formatCurrency(budgetAnalytics.targetMonthlySpending)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {budgetAnalytics.monthsRemaining.toFixed(1)} months left
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <ResponsiveChartContainer
        height={height}
        series={chartSeries}
        xAxis={[
          {
            data: Object.entries(monthList)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([_, value]) => value),
            scaleType: 'band',
          },
        ]}
        yAxis={yAxis}
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
        {/* Add projection line for annual view */}
        {view === BUDGET_VIEW.ANNUAL && annualBudgetAmount > 0 && (
          <>
            <ChartsReferenceLine
              y={budgetAnalytics.projectedAnnualSpending}
              label={`Projected: ${formatCurrency(budgetAnalytics.projectedAnnualSpending)}`}
              labelAlign="start"
              lineStyle={{
                stroke: theme.palette.warning.main,
                strokeDasharray: '3 3',
                strokeWidth: 1.5,
                strokeOpacity: 0.8,
              }}
              labelStyle={{ fill: theme.palette.warning.main, fontSize: '0.8em' }}
            />
            {/* Confidence Range - High */}
            <ChartsReferenceLine
              y={budgetAnalytics.confidenceRange.high}
              label={`High: ${formatCurrency(budgetAnalytics.confidenceRange.high)}`}
              labelAlign="start"
              lineStyle={{
                stroke: theme.palette.grey[400],
                strokeDasharray: '2 2',
                strokeWidth: 1,
                strokeOpacity: 0.5,
              }}
              labelStyle={{ fill: theme.palette.grey[600], fontSize: '0.7em' }}
            />
            {/* Confidence Range - Low */}
            <ChartsReferenceLine
              y={budgetAnalytics.confidenceRange.low}
              label={`Low: ${formatCurrency(budgetAnalytics.confidenceRange.low)}`}
              labelAlign="start"
              lineStyle={{
                stroke: theme.palette.grey[400],
                strokeDasharray: '2 2',
                strokeWidth: 1,
                strokeOpacity: 0.5,
              }}
              labelStyle={{ fill: theme.palette.grey[600], fontSize: '0.7em' }}
            />
          </>
        )}
        <ChartsXAxis />
        <ChartsYAxis />
        <ChartsTooltip />
      </ResponsiveChartContainer>

      <Box sx={{ textAlign: 'center' }}>
        <Button onClick={() => setOpenManageBudget(true)}>Manage budget</Button>
        <Dialog fullWidth maxWidth="sm" open={openManageBudget} onClose={() => setOpenManageBudget(false)}>
          <form onSubmit={updateBudget}>
            <DialogTitle>Manage Budget</DialogTitle>
            <DialogContent>
              <DialogContentText>Please enter your {props.provider} annual budget here.</DialogContentText>
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <ProviderIcon provider={provider} />
                &nbsp;&nbsp;
                <FormControl variant="standard">
                  <InputLabel>Amount</InputLabel>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    startAdornment={<InputAdornment position="start">$</InputAdornment>}
                    defaultValue={annualBudgetAmount}
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
      </Box>
    </Paper>
  );
}

interface BudgetInsightsProps {
  reports: Report[];
  budgets: Budget[];
}

function BudgetInsights({ reports, budgets }: BudgetInsightsProps) {
  const insights = reports
    .map(report => {
      const budget = budgets.find(b => b.provider.toLowerCase() === report.id.toLowerCase());
      if (!budget?.amount) return null;

      const analytics = calculateBudgetAnalytics(report.reports, budget.amount);
      return { provider: report.id, budget, analytics };
    })
    .filter(Boolean);

  const totalBudget = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalProjected = insights.reduce((sum, i) => sum + (i?.analytics.projectedAnnualSpending || 0), 0);
  const overBudgetProviders = insights.filter(i => i?.analytics.budgetHealthStatus === 'critical');
  const atRiskProviders = insights.filter(i => i?.analytics.budgetHealthStatus === 'warning');

  const getRecommendations = () => {
    const recommendations = [];

    if (overBudgetProviders.length > 0) {
      recommendations.push({
        type: 'critical',
        message: `${overBudgetProviders.length} provider(s) are over budget: ${overBudgetProviders.map(p => p?.provider).join(', ')}`,
      });
    }

    if (atRiskProviders.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `${atRiskProviders.length} provider(s) at risk: ${atRiskProviders.map(p => p?.provider).join(', ')}`,
      });
    }

    if (totalProjected > totalBudget) {
      recommendations.push({
        type: 'info',
        message: `Total projected spending (${formatCurrency(totalProjected)}) exceeds total budget (${formatCurrency(totalBudget)}) by ${formatCurrency(totalProjected - totalBudget)}`,
      });
    }

    const highVelocityProviders = insights.filter(i => i?.analytics && i.analytics.spendingVelocity > 20);
    if (highVelocityProviders.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `High spending acceleration detected in: ${highVelocityProviders.map(p => p?.provider).join(', ')}`,
      });
    }

    return recommendations;
  };

  const recommendations = getRecommendations();

  if (insights.length === 0) return null;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Budget Insights
        </Typography>

        {/* Overview Stats */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary">
                {insights.length}
              </Typography>
              <Typography variant="caption">Providers</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography variant="h4" color={overBudgetProviders.length > 0 ? 'error' : 'success.main'}>
                {overBudgetProviders.length}
              </Typography>
              <Typography variant="caption">Over Budget</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography variant="h4" color={atRiskProviders.length > 0 ? 'warning.main' : 'success.main'}>
                {atRiskProviders.length}
              </Typography>
              <Typography variant="caption">At Risk</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography variant="h4" color={totalProjected > totalBudget ? 'error' : 'success.main'}>
                {((totalProjected / totalBudget) * 100).toFixed(0)}%
              </Typography>
              <Typography variant="caption">Projected vs Budget</Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Recommendations
            </Typography>
            {recommendations.map(rec => (
              <Chip
                key={`${rec.type}-${rec.message}`}
                label={rec.message}
                size="small"
                color={getRecommendationColor(rec.type)}
                variant="outlined"
                sx={{ mr: 1, mb: 1, maxWidth: '100%' }}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export const Budgets: FC<BudgetsProps> = ({ providerErrorsSetter }) => {
  const [reportsAggregatedAndMerged, setReportsAggregatedAndMerged] = useState<Report[] | undefined>(undefined);
  const [budgetView, setBudgetView] = useState(BUDGET_VIEW.ANNUAL);
  const [budgets, setBudgets] = useState<Budget[]>([]);

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

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const response = await infraWalletApi.getBudgets('default');
        setBudgets(response.data || []);
      } catch (error) {
        // Failed to fetch budgets - silent error handling
      }
    };
    fetchBudgets();
  }, [infraWalletApi]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">
            {moment().year()} {budgetView} Budgets
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">Annual</Typography>
            <Switch
              size="small"
              onChange={event => setBudgetView(event.target.checked ? BUDGET_VIEW.MONTHLY : BUDGET_VIEW.ANNUAL)}
            />
            <Typography variant="body2">Monthly</Typography>
          </Box>
        </Box>
      </Grid>

      {/* Budget Insights Panel */}
      {reportsAggregatedAndMerged && (
        <Grid item xs={12}>
          <BudgetInsights reports={reportsAggregatedAndMerged} budgets={budgets} />
        </Grid>
      )}
      {reportsAggregatedAndMerged !== undefined ? (
        reportsAggregatedAndMerged.map(report => (
          <Grid item key={`${report.id}-grid`} xs={4}>
            <BudgetChart
              provider={report.id}
              monthlyCosts={report.reports}
              view={budgetView}
              budgets={budgets}
              setBudgets={setBudgets}
            />
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
