import { Paper } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import humanFormat from 'human-format';
import React, { FC } from 'react';
import Chart from 'react-apexcharts';
import { PieChartComponentProps } from '../types';

export const PieChartComponent: FC<PieChartComponentProps> = ({
  categories,
  series,
  height,
}) => {
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
        formatter: (value: number, { seriesIndex, w }: { seriesIndex: number, w: any }) => {
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
      colors: [
        '#008FFB',
        '#00E396',
        '#FEB019',
        '#FF4560',
        '#775DD0',
        '#3F51B5',
        '#03A9F4',
        '#4CAF50',
        '#F9CE1D',
        '#FF9800',
        '#33B2DF',
        '#546E7A',
        '#D4526E',
        '#13D8AA',
        '#A5978B',
        '#4ECDC4',
        '#C7F464',
        '#81D4FA',
        '#546E7A',
        '#FD6A6A',
        '#2B908F',
        '#F9A3A4',
        '#90EE7E',
        '#FA4443',
        '#69D2E7',
        '#449DD1',
        '#F86624',
        '#EA3546',
        '#662E9B',
        '#C5D86D',
        '#D7263D',
        '#1B998B',
        '#2E294E',
        '#F46036',
        '#E2C044',
        '#662E9B',
        '#F86624',
        '#F9C80E',
        '#EA3546',
        '#43BCCD',
        '#5C4742',
        '#A5978B',
        '#8D5B4C',
        '#5A2A27',
        '#C4BBAF',
        '#A300D6',
        '#7D02EB',
        '#5653FE',
        '#2983FF',
        '#00B1F2',
      ],
    },
    series: series,
  };

  return (
    <Paper className={classes.fixedHeightPaper}>
      <Chart
        options={state.options}
        series={state.series}
        type="donut"
        height={height ? height : 300}
      />
    </Paper>
  );
};
