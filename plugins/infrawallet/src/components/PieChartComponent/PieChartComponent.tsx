import { Paper } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import humanFormat from 'human-format';
import React, { FC } from 'react';
import Chart from 'react-apexcharts';
import { colorList } from '../constants';
import { PieChartComponentProps } from '../types';

export const PieChartComponent: FC<PieChartComponentProps> = ({ categories, series, height }) => {
  const useStyles = makeStyles({
    fixedHeightPaper: {
      paddingTop: '10px',
      overflow: 'hidden',
      height: height ? height : 300,
    },
  });
  const classes = useStyles();
  const customScale = humanFormat.Scale.create(['', 'K', 'M', 'B'], 1000);

  const state = {
    options: {
      chart: {
        animations: {
          enabled: false,
        },
      },
      legend: {
        show: false,
      },
      labels: categories,
      dataLabels: {
        enabled: true,
        formatter: (value: number, { seriesIndex, w }: { seriesIndex: number; w: any }) => {
          return `${w.config.labels[seriesIndex]} (${value.toFixed(0)}%)`;
        },
      },
      tooltip: {
        y: {
          formatter: (value: number) => {
            return `$${humanFormat(value, {
              scale: customScale,
              separator: '',
            })}`;
          },
        },
      },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: true,
              value: {
                formatter: (val: string) => {
                  const floatVal = parseFloat(val);
                  return `$${humanFormat(floatVal, {
                    scale: customScale,
                    separator: '',
                  })}`;
                },
              },
            },
          },
        },
      },
      // there are only 5 colors by default, here we extend it to 50 different colors
      colors: colorList,
    },
    series: series,
  };

  return (
    <Paper className={classes.fixedHeightPaper}>
      <Chart options={state.options} series={state.series} type="donut" height={height ? height : 300} />
    </Paper>
  );
};
