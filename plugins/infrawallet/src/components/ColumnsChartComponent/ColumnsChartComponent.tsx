import { Paper } from '@material-ui/core';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import humanFormat from 'human-format';
import React, { FC } from 'react';
import Chart from 'react-apexcharts';
import { ColumnsChartComponentProps } from '../types';

export const ColumnsChartComponent: FC<ColumnsChartComponentProps> = ({
  categories,
  series,
  height,
  thumbnail,
  dataPointSelectionHandler,
}) => {
  const defaultTheme = useTheme();
  const useStyles = makeStyles({
    fixedHeightPaper: {
      padding: '16px',
      display: 'flex',
      overflow: 'auto',
      flexDirection: 'column',
      height: height ? height : 300,
    },
    thumbnailPaper: {
      display: 'flex',
      overflow: 'auto',
      flexDirection: 'column',
      height: height ? height - 50 : 100,
    },
  });
  const classes = useStyles();
  const customScale = humanFormat.Scale.create(['', 'K', 'M', 'B'], 1000);

  const state = thumbnail
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
              show: true,
            },
            events: {
              dataPointSelection: dataPointSelectionHandler,
            },
          },
          xaxis: {
            categories: categories,
          },
          yaxis: {
            decimalsInFloat: 2,
          },
          dataLabels: {
            formatter: (val: number) => {
              if (val) {
                return `$${humanFormat(val, {
                  scale: customScale,
                  separator: '',
                })}`;
              }
              return 'null';
            },
          },
          legend: {
            showForSingleSeries: true,
          },
          theme: {
            mode: defaultTheme.palette.type,
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
    <Paper
      className={thumbnail ? classes.thumbnailPaper : classes.fixedHeightPaper}
    >
      <Chart
        options={state.options}
        series={state.series}
        type="bar"
        height={height ? height - 50 : 250}
      />
    </Paper>
  );
};
