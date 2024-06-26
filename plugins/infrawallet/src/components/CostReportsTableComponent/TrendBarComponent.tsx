import React, { FC } from 'react';
import { Box } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { TrendBarComponentProps } from '../types';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

export const TrendBarComponent: FC<TrendBarComponentProps> = ({ categories, series, height, width }) => {
  const useStyles = makeStyles({
    fixedBox: {
      display: 'flex',
      height: height ? height : 25,
      width: width ? width : 100,
    },
  });
  const classes = useStyles();

  const options: ApexOptions = {
    chart: {
      width: width ? width : 100,
      type: 'bar',
      animations: {
        enabled: false,
      },
      zoom: {
        enabled: false,
      },
      toolbar: {
        show: false,
      },
      sparkline: {
        enabled: true,
      },
    },
    tooltip: {
      enabled: false,
    },
    xaxis: {
      categories: categories,
    },
  };

  return (
    <Box className={classes.fixedBox}>
      <Chart options={options} series={series} type="bar" height="100%" />
    </Box>
  );
};
