import { Grid, Paper, Switch } from '@material-ui/core';
import { withStyles, makeStyles, useTheme } from '@material-ui/core/styles';
import humanFormat from 'human-format';
import React, { FC } from 'react';
import Chart from 'react-apexcharts';
import { ColumnsChartComponentProps } from '../types';

const Toggle = withStyles((theme) => ({
  root: {
    width: 28,
    height: 16,
    padding: 0,
    display: 'flex',
  },
  switchBase: {
    padding: 2,
    color: theme.palette.grey[500],
    '&$checked': {
      transform: 'translateX(12px)',
      color: theme.palette.common.white,
      '& + $track': {
        opacity: 1,
        backgroundColor: theme.palette.primary.main,
        borderColor: theme.palette.primary.main,
      },
    },
  },
  thumb: {
    width: 12,
    height: 12,
    boxShadow: 'none',
  },
  track: {
    border: `1px solid ${theme.palette.grey[500]}`,
    borderRadius: 16 / 2,
    opacity: 1,
    backgroundColor: theme.palette.common.white,
  },
  checked: {},
}))(Switch);

export const ColumnsChartComponent: FC<ColumnsChartComponentProps> = ({
  granularitySetter,
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
            show: false,
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
          enabled: false,
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
      <Grid container justifyContent="flex-end" spacing={1}>
        <Grid item>Monthly</Grid>
        <Grid item>
          <Toggle onChange={event => granularitySetter(event.target.checked ? 'daily' : 'monthly')} />
        </Grid>
        <Grid item>Daily</Grid>
      </Grid>
      <Chart
        options={state.options}
        series={state.series}
        type="bar"
        height={height ? height - 50 : 250}
      />
    </Paper>
  );
};
