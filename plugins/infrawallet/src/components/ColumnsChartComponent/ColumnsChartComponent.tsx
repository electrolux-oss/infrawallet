import { Grid, Paper, Switch } from '@material-ui/core';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import React, { FC, useCallback, useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { colorList } from '../constants';
import { ColumnsChartComponentProps } from '../types';
import Skeleton from '@material-ui/lab/Skeleton';
import { formatNumber } from '../../api/functions';

type CurveType =
  | 'smooth'
  | 'straight'
  | 'stepline'
  | 'linestep'
  | 'monotoneCubic'
  | ('smooth' | 'straight' | 'stepline' | 'linestep' | 'monotoneCubic')[]
  | undefined;

export const ColumnsChartComponent: FC<ColumnsChartComponentProps> = ({
  granularitySetter,
  categories,
  series,
  metrics,
  height,
  thumbnail,
  dataPointSelectionHandler,
}) => {
  const defaultTheme = useTheme();
  const useStyles = makeStyles({
    fixedHeightPaper: {
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      height: height ? height : 300,
    },
    thumbnailPaper: {
      display: 'flex',
      overflow: 'hidden',
      flexDirection: 'column',
      height: height ? height - 70 : 80,
    },
  });
  const classes = useStyles();
  const [showMetrics, setShowMetrics] = useState<boolean>(false);
  const [seriesArray, setSeriesArray] = useState<any[]>([]);
  const [yaxisArray, setYaxisArray] = useState<any[]>([]);
  const [strokeWidthArray, setStrokeWidthArray] = useState<number[]>([]);
  const [strokeDashArray, setStrokeDashArray] = useState<number[]>([]);

  let state = undefined;
  if (series) {
    state = thumbnail
      ? {
          options: {
            chart: {
              animations: {
                enabled: false,
              },
              zoom: {
                enabled: false,
              },
              stacked: true,
              toolbar: {
                show: false,
              },
              sparkline: {
                enabled: true,
              },
            },
            xaxis: {
              categories: categories,
            },
            theme: {
              mode: defaultTheme.palette.type,
            },
          },
          series: series,
        }
      : {
          options: {
            chart: {
              animations: {
                enabled: false,
              },
              stacked: true,
              toolbar: {
                show: false,
              },
              events: {
                dataPointSelection: dataPointSelectionHandler,
              },
            },
            xaxis: {
              categories: categories,
            },
            stroke: {
              width: strokeWidthArray,
              dashArray: strokeDashArray,
              curve: 'smooth' as CurveType,
            },
            yaxis: yaxisArray,
            dataLabels: {
              enabled: false,
            },
            tooltip: {
              y: {
                formatter: (value: number, { seriesIndex }: { seriesIndex: number }) => {
                  if (!value) {
                    return '';
                  }
                  const prefix = seriesIndex <= series.length - 1 ? '$' : '';
                  return `${prefix}${formatNumber(value)}`;
                },
              },
              fixed: {
                enabled: true,
                position: 'topRight',
              },
            },
            legend: {
              showForSingleSeries: true,
            },
            theme: {
              mode: defaultTheme.palette.type,
            },
            // there are only 5 colors by default, here we extend it to 50 different colors
            colors: colorList,
          },
          series: seriesArray,
        };
  }

  const initChartCallback = useCallback(async () => {
    if (series === undefined) {
      return;
    }

    const labelFormatter = (value: number): string => {
      if (typeof value !== 'number' || isNaN(value)) {
        return '';
      }
      return `$${formatNumber(value)}`;
    };

    const strokeWidth = Array<number>(series.length).fill(0);
    const seriesResult = series.map(s => s);
    const yaxisResult: any[] = [
      {
        seriesName: series.map(s => s.name),
        decimalsInFloat: 2,
        title: {
          text: 'Costs in USD',
        },
        labels: {
          formatter: labelFormatter,
        },
      },
    ];

    if (metrics && showMetrics) {
      const metricGroups: any = {};
      metrics.forEach(metric => {
        strokeWidth.push(3);
        seriesResult.push(metric);

        if (metric.group) {
          if (!metricGroups[metric.group]) {
            metricGroups[metric.group] = {
              seriesName: [metric.name],
              decimalsInFloat: 2,
              opposite: true,
              forceNiceScale: true,
              title: {
                text: metric.group,
              },
              labels: {
                formatter: labelFormatter,
              },
            };
          } else {
            // yaxis already exists, add the series to the existing one
            metricGroups[metric.group].seriesName.push(metric.name);
          }
        } else {
          // the metric does not have a group, create a separate yaxis for it
          yaxisResult.push({
            seriesName: [metric.name],
            decimalsInFloat: 2,
            opposite: true,
            forceNiceScale: true,
            title: {
              text: metric.name,
            },
            labels: {
              formatter: labelFormatter,
            },
          });
        }
      });
      Object.values(metricGroups).forEach((group: any) => {
        yaxisResult.push(group);
      });
    }

    setSeriesArray(seriesResult);
    setYaxisArray(yaxisResult);
    setStrokeWidthArray(strokeWidth);
    setStrokeDashArray(Array<number>(seriesResult.length).fill(0));
  }, [metrics, series, showMetrics]);

  useEffect(() => {
    initChartCallback();
  }, [initChartCallback]);

  return (
    <Paper className={thumbnail ? classes.thumbnailPaper : classes.fixedHeightPaper}>
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
      {series && state && seriesArray ? (
        <Chart options={state.options} series={state.series} type="line" height={height ? height - 70 : 230} />
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
