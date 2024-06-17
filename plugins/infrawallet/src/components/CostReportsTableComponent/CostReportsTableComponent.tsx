import Chip from '@material-ui/core/Chip';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@mui/material/Box';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import humanFormat from 'human-format';
import React, { FC } from 'react';
import { getPreviousMonth } from '../../api/functions';
import { CostReportsTableComponentProps } from '../types';
import { TrendBarComponent } from './TrendBarComponent';

const useStyles = makeStyles((theme) => ({
  increase: {
    color: 'red',
  },
  decrease: {
    color: 'green',
  },
  container: {
    display: 'flex',
    alignItems: 'center',
  },
  clip: {
    backgroundColor: '#deebff',
    color: '#0052cc',
    marginLeft: theme.spacing(1),
  },
}));

export const CostReportsTableComponent: FC<CostReportsTableComponentProps> = ({
  reports,
  aggregatedBy,
}) => {
  const classes = useStyles();
  const customScale = humanFormat.Scale.create(['', 'K', 'M', 'B'], 1000);
  const periods = Object.keys(reports[0].reports);
  const columns: GridColDef[] = [
    {
      field: aggregatedBy,
      headerName: aggregatedBy.toLocaleUpperCase('en-US'),
      minWidth: 200,
      flex: 2,
      renderCell: (params: GridRenderCellParams): React.ReactNode => {
        return (
          <Typography variant="body2" component="div" className={classes.container}>
            {
              aggregatedBy === 'service' || aggregatedBy === 'name' ?
                (params.formattedValue !== undefined && params.formattedValue.indexOf('/') !== -1
                  ? params.formattedValue.split('/')[1]
                  : params.formattedValue)
                : params.formattedValue
            }
            {
              aggregatedBy === 'service' || aggregatedBy === 'name' ?
                (params.formattedValue !== undefined && params.formattedValue.indexOf('/') !== -1
                  ? <Chip size="small" label={params.formattedValue.split('/')[0].toLowerCase()} className={classes.clip} />
                  : null)
                : null
            }
          </Typography>);
      },
    },
    {
      field: 'TREND',
      headerName: 'TREND',
      width: 100,
      renderCell: (params: GridRenderCellParams): React.ReactNode => {
        return (
          <TrendBarComponent
            categories={Object.keys(params.row.reports)}
            series={[
              {
                name: params.row.id,
                data: periods.map(period =>
                  params.row.reports[period] !== undefined
                    ? params.row.reports[period]
                    : null,
                ),
              },
            ]}
          />
        );
      },
    },
  ];

  periods.forEach(period => {
    columns.push({
      field: period,
      headerName: period,
      type: 'number',
      minWidth: 150,
      flex: 1,
      valueGetter: (_, row) => {
        return row.reports[period] ? row.reports[period] : null;
      },
      valueFormatter: (value, row, column) => {
        if (typeof value === 'number') {
          const previousPeriod = getPreviousMonth(column.field);
          const formattedValue = humanFormat(value, {
            scale: customScale,
            separator: '',
            decimals: 2
          });
          if (
            previousPeriod in row.reports &&
            row.reports[previousPeriod] > 0
          ) {
            const diff =
              row.reports[column.field] - row.reports[previousPeriod];
            const percentage = Math.round((diff / row.reports[previousPeriod]) * 100);
            const mark = diff > 0 ? '+' : '';
            // only display percentage change if it is larger than 1% or less than -1%
            if (percentage >= 1 || percentage <= -1) {
              return `$${formattedValue} (${mark}${percentage}%)`;
            }
          }
          return `$${formattedValue}`;
        }
        return '-';
      },
      renderCell: (params: GridRenderCellParams): React.ReactNode => {
        let className = '';
        const percentageIndex = params.formattedValue.indexOf('(');
        const costStr =
          percentageIndex === -1
            ? params.formattedValue
            : params.formattedValue.substring(0, percentageIndex);
        let percentageStr =
          percentageIndex === -1
            ? ''
            : params.formattedValue.substring(percentageIndex);
        if (percentageStr.includes('-')) {
          className = classes.decrease;
          percentageStr = percentageStr.replace('-', '▼');
        } else if (percentageStr.includes('+')) {
          className = classes.increase;
          percentageStr = percentageStr.replace('+', '▲');
        }

        return (
          <Typography variant="body2">
            {costStr}
            <Typography variant="inherit" className={className}>
              {percentageStr}
            </Typography>
          </Typography>
        );
      },
    });
  });

  columns.push({
    field: 'TOTAL',
    headerName: 'TOTAL',
    type: 'number',
    minWidth: 150,
    flex: 1,
    valueGetter: (_, row) => {
      let total = 0;
      periods.forEach(period => {
        total += row.reports[period] ? row.reports[period] : 0;
      });
      return total;
    },
    valueFormatter: value => {
      if (typeof value === 'number') {
        return `$${humanFormat(value, { scale: customScale, separator: '', decimals: 2 })}`;
      }
      return '-';
    },
    renderCell: (params: GridRenderCellParams): React.ReactNode => {
      return <Typography variant="body2">{params.formattedValue}</Typography>;
    },
  });

  return (
    <Box>
      <DataGrid
        rows={reports}
        rowHeight={35}
        columns={columns}
        initialState={{
          sorting: {
            sortModel: [{ field: 'TOTAL', sort: 'desc' }],
          },
          pagination: {
            paginationModel: {
              pageSize: 15,
            },
          },
        }}
        pageSizeOptions={[5, 15]}
        disableRowSelectionOnClick
      />
    </Box>
  );
};
