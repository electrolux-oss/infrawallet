import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Switch from '@mui/material/Switch';
import {
  BarPlot,
  ChartsGrid,
  ChartsLegend,
  ChartsTooltip,
  ChartsXAxis,
  ChartsYAxis,
  DefaultChartsLegend,
  LineHighlightPlot,
  LinePlot,
  MarkPlot,
  ResponsiveChartContainer,
} from '@mui/x-charts';
import { FC, useCallback, useEffect, useState } from 'react';
import * as React from 'react';
import { formatCurrency, calculateBudgetAnalytics } from '../../api/functions';
import { colorList } from '../constants';
import { ColumnsChartComponentProps } from '../types';
import { getProviderColorIndex } from '../utils';

export const ColumnsChartComponent: FC<ColumnsChartComponentProps> = ({
  granularity,
  granularitySetter,
  periods,
  costs,
  metrics,
  budgets,
  height,
  highlightedItem,
  highlightedItemSetter,
}) => {
  const [costsSeries, setCostsSeries] = useState<any[] | undefined>(undefined);
  const [metricsSeries, setMetricsSeries] = useState<any[] | undefined>(undefined);
  const [showMetrics, setShowMetrics] = useState<boolean>(false);
  const [maxCostsYaxis, setMaxCostsYaxis] = useState<number | undefined>(undefined);

  // Helper: Calculate cost sums across all series
  const calculateCostSums = useCallback((costsData: any[]) => {
    const sums = [];
    for (const s of costsData) {
      for (let i = 0; i < s.data.length; i++) {
        if (sums[i] === undefined) {
          sums[i] = 0;
        }
        sums[i] += s.data[i];
      }
    }
    return sums;
  }, []);

  // Helper: Create base costs series
  const createBaseCostsSeries = useCallback((costsData: any[]) => {
    return costsData.map(s => {
      const colorIndex = getProviderColorIndex(s.name);
      return {
        id: s.name,
        data: s.data,
        type: 'bar' as const,
        label: `${s.name} Actual Spend`,
        yAxisId: 'costsAxis',
        valueFormatter: (value: number) => formatCurrency(value || 0),
        highlightScope: { highlight: 'series', fade: 'global' } as const,
        stack: 'stack1',
        stackOrder: 'descending' as const,
        color: colorList[colorIndex],
      };
    });
  }, []);

  // Helper: Build monthly costs lookup
  const buildMonthlyCosts = useCallback(
    (seriesData: number[]) => {
      const monthlyCosts: Record<string, number> = {};
      periods.forEach((period, index) => {
        monthlyCosts[period] = seriesData[index] || 0;
      });
      return monthlyCosts;
    },
    [periods],
  );

  // Helper: Create single projected series
  const createProjectedSeries = useCallback(
    (series: any, budget: any, forecast: any) => {
      const effectiveBudget = budget?.amount ? budget : { amount: 100000, provider: series.name };
      if (!effectiveBudget?.amount) return null;

      const lastIndex = series.data.length - 1;
      if (lastIndex < 0) return null;

      const lastActualCost = series.data[lastIndex] || 0;

      // Get the forecast value for the current month (last index)
      let forecastValue: number | null = null;

      // First, try to use per-product forecast from series
      if (series.forecast && series.forecast[lastIndex] !== null && series.forecast[lastIndex] > 0) {
        forecastValue = series.forecast[lastIndex];
      }
      // Fall back to aggregated forecast if available
      else if (typeof forecast === 'number' && forecast > 0) {
        forecastValue = forecast;
      }

      // If we have a forecast value, calculate the delta
      let projectedDelta = 0;
      if (forecastValue !== null && forecastValue > lastActualCost) {
        projectedDelta = forecastValue - lastActualCost;
      } else {
        // No valid forecast, try using calculateBudgetAnalytics
        const monthlyCosts = buildMonthlyCosts(series.data);
        const analytics = calculateBudgetAnalytics(monthlyCosts, effectiveBudget.amount, forecast);
        projectedDelta = analytics.projectedCurrentMonthCost - lastActualCost;
      }

      if (projectedDelta <= 0) return null;

      const deltaData = series.data.map((_: any, i: number) => (i === lastIndex ? projectedDelta : 0));

      const colorIndex = getProviderColorIndex(series.name);
      const providerColor = colorList[colorIndex];

      return {
        id: `${series.name}-projected`,
        data: deltaData,
        type: 'bar' as const,
        label: `${series.name} Forecast`,
        yAxisId: 'costsAxis',
        color: `${providerColor}70`,
        valueFormatter: (value: number) => {
          if (value === 0) return null;
          return `Forecast: ${formatCurrency(projectedDelta)}`;
        },
        highlightScope: { highlight: 'series', fade: 'global' } as const,
        stack: 'stack1',
        stackOrder: 'descending' as const,
      };
    },
    [buildMonthlyCosts],
  );

  // Helper: Create all projected delta series
  const createProjectedDeltaSeries = useCallback(
    (costsData: any[]) => {
      if (granularity !== 'monthly') return [];

      const projectedSeries: any[] = [];
      costsData.forEach(s => {
        const budget = budgets?.find(b => b.provider.toLowerCase() === s.name.toLowerCase());
        const projectedData = createProjectedSeries(s, budget, undefined);

        if (projectedData) {
          projectedSeries.push(projectedData);
        }
      });
      return projectedSeries;
    },
    [granularity, budgets, createProjectedSeries],
  );

  // Helper: Calculate maximum Y-axis value
  const calculateMaxYAxis = useCallback((baseSums: number[], projectedSeries: any[]) => {
    const allSums = [...baseSums];
    for (const deltaSeries of projectedSeries) {
      for (let i = 0; i < deltaSeries.data.length; i++) {
        if (deltaSeries.data[i] > 0) {
          allSums[i] = (allSums[i] || 0) + deltaSeries.data[i];
        }
      }
    }
    return Math.max(...allSums);
  }, []);

  // Helper: Create metrics series
  const createMetricsSeriesData = useCallback(() => {
    if (!metrics || !showMetrics) return undefined;

    return metrics.map(s => ({
      data: s.data,
      type: 'line' as const,
      label: s.name,
      curve: 'natural' as const,
      yAxisId: 'metricsAxis',
      highlightScope: { highlight: 'series', fade: 'global' } as const,
      showMark: granularity === 'monthly',
    }));
  }, [metrics, showMetrics, granularity]);

  const initChartCallback = useCallback(async () => {
    setCostsSeries(undefined);
    setMetricsSeries(undefined);

    if (costs) {
      const sums = calculateCostSums(costs);
      const baseCostsSeries = createBaseCostsSeries(costs);
      const projectedDeltaSeries = createProjectedDeltaSeries(costs);
      const maxYValue = calculateMaxYAxis(sums, projectedDeltaSeries);

      setMaxCostsYaxis(maxYValue);
      setCostsSeries([...baseCostsSeries, ...projectedDeltaSeries]);
    }

    const metricsData = createMetricsSeriesData();
    if (metricsData) {
      setMetricsSeries(metricsData);
    }
  }, [
    costs,
    calculateCostSums,
    createBaseCostsSeries,
    createProjectedDeltaSeries,
    calculateMaxYAxis,
    createMetricsSeriesData,
  ]);

  useEffect(() => {
    initChartCallback();
  }, [initChartCallback]);

  return (
    <Paper
      sx={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        height: height ? height : 300,
      }}
    >
      <Grid container justifyContent="flex-end" spacing={1}>
        <Grid item>Monthly</Grid>
        <Grid item>
          <Switch size="small" onChange={event => granularitySetter(event.target.checked ? 'daily' : 'monthly')} />
        </Grid>
        <Grid item>Daily</Grid>
        <Grid item> | </Grid>
        <Grid item>
          <Switch size="small" checked={showMetrics} onChange={_ => setShowMetrics((ori: boolean) => !ori)} />
        </Grid>
        <Grid item>Show Metrics</Grid>
      </Grid>
      {costs !== undefined && costsSeries !== undefined ? (
        <ResponsiveChartContainer
          margin={{
            bottom: 6 * costsSeries.length + 80,
          }}
          series={[...costsSeries, ...(metricsSeries ? metricsSeries : [])]}
          xAxis={[
            {
              data: periods,
              scaleType: 'band',
            },
          ]}
          yAxis={[
            {
              id: 'costsAxis',
              max: maxCostsYaxis,
              valueFormatter: value => formatCurrency(value),
            },
            {
              id: 'metricsAxis',
            },
          ]}
          highlightedItem={highlightedItem ? { seriesId: highlightedItem } : null}
          onHighlightChange={highlighted => {
            highlightedItemSetter(highlighted?.seriesId);
          }}
        >
          <ChartsGrid horizontal />
          <BarPlot />
          <LinePlot />
          <MarkPlot />
          <LineHighlightPlot />
          <ChartsXAxis
            tickLabelStyle={{
              angle: periods.length > 12 ? -45 : 0,
              textAnchor: periods.length > 12 ? 'end' : 'middle',
            }}
          />
          <ChartsYAxis />
          <ChartsTooltip trigger="item" />
          <ChartsLegend
            slots={{
              legend: props => {
                // keep legend items for costs only (from bar chart)
                const seriesToDisplay = [];
                for (const s of props.seriesToDisplay) {
                  if (props.series.bar?.seriesOrder && props.series.bar.seriesOrder.indexOf(s.id) !== -1) {
                    seriesToDisplay.push(s);
                  }
                }

                return (
                  <DefaultChartsLegend
                    series={props.series}
                    seriesToDisplay={seriesToDisplay}
                    drawingArea={props.drawingArea}
                    direction="row"
                    position={{ vertical: 'bottom', horizontal: 'middle' }}
                    itemMarkHeight={10}
                    itemMarkWidth={10}
                    itemGap={costsSeries.length > 5 ? 5 : 10}
                    labelStyle={{
                      fontSize: '0.9em',
                    }}
                    onItemClick={(_, legendItem) => {
                      // highlight the clicked item
                      const clickedLegend = legendItem.seriesId;
                      if (clickedLegend === highlightedItem) {
                        highlightedItemSetter(undefined);
                      } else {
                        highlightedItemSetter(clickedLegend);
                      }
                    }}
                  />
                );
              },
            }}
          />
        </ResponsiveChartContainer>
      ) : (
        <div style={{ width: '60%', margin: 'auto' }}>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      )}
    </Paper>
  );
};
