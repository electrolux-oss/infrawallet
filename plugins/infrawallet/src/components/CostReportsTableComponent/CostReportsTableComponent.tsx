import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@mui/material/Box';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import humanFormat from 'human-format';
import React, { FC } from 'react';
import { getPreviousMonth } from '../../api/functions';
import { CostReportsTableComponentProps } from '../types';
import { TrendBarComponent } from './TrendBarComponent';

const useStyles = makeStyles({
  increase: {
    color: 'red',
  },
  decrease: {
    color: 'green',
  },
});

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
        return <Typography variant="body2">{params.formattedValue}</Typography>;
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
          });
          if (
            previousPeriod in row.reports &&
            row.reports[previousPeriod] > 0
          ) {
            const diff =
              row.reports[column.field] - row.reports[previousPeriod];
            const percentage = (diff / row.reports[previousPeriod]) * 100;
            const mark = diff > 0 ? '+' : '';
            return `$${formattedValue} (${mark}${percentage.toFixed(2)}%)`;
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
        const percentageStr =
          percentageIndex === -1
            ? ''
            : params.formattedValue.substring(percentageIndex);
        if (percentageStr.includes('-')) {
          className = classes.decrease;
        } else if (percentageStr.includes('+')) {
          className = classes.increase;
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
        return `$${humanFormat(value, { scale: customScale, separator: '' })}`;
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
