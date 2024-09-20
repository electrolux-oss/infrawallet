import { Paper } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import React, { FC } from 'react';
import Chart from 'react-apexcharts';
import { colorList } from '../constants';
import { PieChartComponentProps } from '../types';
import Skeleton from '@material-ui/lab/Skeleton';
import { formatNumber } from '../../api/functions';

export const PieChartComponent: FC<PieChartComponentProps> = ({ categories, series, height }) => {
  const useStyles = makeStyles({
    fixedHeightPaper: {
      alignContent: 'center',
      height: height ? height : 300,
    },
  });
  const classes = useStyles();

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
        enabled: false,
      },
      tooltip: {
        y: {
          formatter: (value: number) => {
            return `$${formatNumber(value)}`;
          },
        },
      },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: true,
              total: {
                show: true,
                showAlways: true,
                formatter: (value: any) => {
                  let total = 0;
                  for (const i of value.config.series) {
                    total += i;
                  }
                  return `$${formatNumber(total)}`;
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
      {series === undefined ? (
        <div style={{ width: '60%', margin: 'auto' }}>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : (
        <Chart options={state.options} series={state.series} type="donut" height={height ? height : 300} />
      )}
    </Paper>
  );
};
