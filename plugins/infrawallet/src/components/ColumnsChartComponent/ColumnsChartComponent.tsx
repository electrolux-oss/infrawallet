import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Switch from '@mui/material/Switch';
import { useTheme } from '@mui/material/styles';
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
import { FC, default as React, useCallback, useEffect, useState } from 'react';
import { formatCurrency, calculateBudgetAnalytics } from '../../api/functions';
import { colorList } from '../constants';
import { ColumnsChartComponentProps } from '../types';

export const ColumnsChartComponent: FC<ColumnsChartComponentProps> = ({
  granularity,
  granularitySetter,
  periods,
  costs,
  metrics,
  budgets,
  forecasts,
  height,
  highlightedItem,
  highlightedItemSetter,
}) => {
  const theme = useTheme();
  const [costsSeries, setCostsSeries] = useState<any[] | undefined>(undefined);
  const [metricsSeries, setMetricsSeries] = useState<any[] | undefined>(undefined);
  const [showMetrics, setShowMetrics] = useState<boolean>(false);
  const [maxCostsYaxis, setMaxCostsYaxis] = useState<number | undefined>(undefined);

  const initChartCallback = useCallback(async () => {
    setCostsSeries(undefined);
    setMetricsSeries(undefined);

    if (costs) {
      const sums = [];
      for (const s of costs) {
        for (let i = 0; i < s.data.length; i++) {
          if (sums[i] === undefined) {
            sums[i] = 0;
          }
          sums[i] += s.data[i];
        }
      }

      const baseCostsSeries = costs.map(s => {
        return {
          id: s.name,
          data: s.data,
          type: 'bar',
          label: `${s.name} Actual Spend`,
          yAxisId: 'costsAxis',
          valueFormatter: (value: number) => {
            return formatCurrency(value ? value : 0);
          },
          highlightScope: { highlight: 'series', fade: 'global' },
          stack: 'stack1',
          stackOrder: 'descending',
        };
      });

      const projectedDeltaSeries = [];
      
      if (granularity === 'monthly' && costs) {
        for (const s of costs) {
          const budget = budgets?.find(b => b.provider.toLowerCase() === s.name.toLowerCase());
          const forecast = forecasts?.[s.name];
          const effectiveBudget = budget?.amount ? budget : { amount: 100000, provider: s.name };
          if (effectiveBudget?.amount) {
            const monthlyCosts: Record<string, number> = {};
            periods.forEach((period, index) => {
              monthlyCosts[period] = s.data[index] || 0;
            });
            
            const analytics = calculateBudgetAnalytics(monthlyCosts, effectiveBudget.amount, forecast);
            
            const lastIndex = s.data.length - 1;
            const lastActualCost = lastIndex >= 0 ? s.data[lastIndex] : 0;
            const projectedCurrentMonthCost = analytics.projectedCurrentMonthCost;
            const projectedDelta = projectedCurrentMonthCost -lastActualCost;
            
            if (lastIndex >= 0 && projectedDelta > 0) {
              const deltaData = s.data.map((_, i) => (i === lastIndex ? projectedDelta : 0));
              
              projectedDeltaSeries.push({
                id: `${s.name}-projected`,
                data: deltaData,
                type: 'bar',
                label: `${s.name} Projected Delta`,
                yAxisId: 'costsAxis',
                color: theme.palette.warning.main,
                valueFormatter: (value: number) => {
                  if (value === 0) return null;
                  return `${formatCurrency(projectedDelta)}`;
                },
                highlightScope: { highlight: 'series', fade: 'global' },
                stack: 'stack1',
                stackOrder: 'descending',
              });
            }
          }
        }
      }

      const allSums = [...sums];
      for (const deltaSeries of projectedDeltaSeries) {
        for (let i = 0; i < deltaSeries.data.length; i++) {
          if (deltaSeries.data[i] > 0) {
            allSums[i] = (allSums[i] || 0) + deltaSeries.data[i];
          }
        }
      }
      setMaxCostsYaxis(Math.max(...allSums));

      setCostsSeries([...baseCostsSeries, ...projectedDeltaSeries]);
    }

    if (metrics && showMetrics) {
      setMetricsSeries(
        metrics.map(s => {
          return {
            data: s.data,
            type: 'line',
            label: s.name,
            curve: 'natural',
            yAxisId: 'metricsAxis',
            highlightScope: { highlight: 'series', fade: 'global' },
            showMark: granularity === 'monthly',
          };
        }),
      );
    }
  }, [costs, metrics, showMetrics, granularity, periods, theme]);

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
          colors={colorList}
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
