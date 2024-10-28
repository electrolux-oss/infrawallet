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
import React, { FC, useCallback, useEffect, useState } from 'react';
import { formatCurrency } from '../../api/functions';
import { colorList } from '../constants';
import { ColumnsChartComponentProps } from '../types';

export const ColumnsChartComponent: FC<ColumnsChartComponentProps> = ({
  granularity,
  granularitySetter,
  periods,
  costs,
  metrics,
  height,
  highlightedItem,
  highlightedItemSetter,
}) => {
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
      setMaxCostsYaxis(Math.max(...sums));

      setCostsSeries(
        costs.map(s => {
          return {
            id: s.name,
            data: s.data,
            type: 'bar',
            label: s.name,
            yAxisId: 'costsAxis',
            valueFormatter: (value: number) => {
              return formatCurrency(value ? value : 0);
            },
            highlightScope: { highlight: 'series', fade: 'global' },
            stack: 'total',
            stackOrder: 'descending',
          };
        }),
      );
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
  }, [costs, metrics, showMetrics, granularity]);

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
