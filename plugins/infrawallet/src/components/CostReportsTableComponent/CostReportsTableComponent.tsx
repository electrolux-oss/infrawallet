import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@mui/material/Box';
import { DataGrid, GridColDef, GridRenderCellParams, GridToolbarContainer, GridToolbarExport } from '@mui/x-data-grid';
import humanFormat from 'human-format';
import React, { FC } from 'react';
import { extractAccountInfo, getPreviousMonth } from '../../api/functions';
import { CostReportsTableComponentProps } from '../types';
import { getProviderIcon } from '../ProviderIcons';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';

const useStyles = makeStyles({
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
});

function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarExport
        csvOptions={{ fileName: 'InfraWallet-export' }}
        printOptions={{ disableToolbarButton: true }}
      />
    </GridToolbarContainer>
  );
}

export const CostReportsTableComponent: FC<CostReportsTableComponentProps> = ({ reports, aggregatedBy, periods }) => {
  const classes = useStyles();
  const customScale = humanFormat.Scale.create(['', 'K', 'M', 'B'], 1000);

  const formatCostValue = (params: GridRenderCellParams, period: string): string => {
    const value = params.value;
    if (typeof value === 'number') {
      const previousPeriod = period.length === 7 ? getPreviousMonth(params.field) : '';
      const formattedValue = humanFormat(value, {
        scale: customScale,
        separator: '',
        decimals: 2,
      });
      if (periods.includes(previousPeriod) && params.row.reports[previousPeriod] > 0) {
        const diff = params.row.reports[params.field] - params.row.reports[previousPeriod];
        const percentage = Math.round((diff / params.row.reports[previousPeriod]) * 100);
        const mark = diff > 0 ? '+' : '';
        // only display percentage change if it is larger than 1% or less than -1%
        if (percentage >= 1 || percentage <= -1) {
          return `$${formattedValue} (${mark}${percentage}%)`;
        }
      }
      return `$${formattedValue}`;
    }
    return '-';
  };

  const columns: GridColDef[] = [];
  if (['account', 'provider', 'service'].includes(aggregatedBy)) {
    columns.push({
      field: 'PROVIDER',
      headerName: '',
      width: 30,
      disableExport: true,
      renderCell: (params: GridRenderCellParams): React.ReactNode => {
        return getProviderIcon(params.row.provider);
      },
    });
  }

  columns.push(
    {
      field: aggregatedBy,
      headerName: aggregatedBy.toLocaleUpperCase('en-US'),
      minWidth: 200,
      flex: 2,
      renderCell: (params: GridRenderCellParams): React.ReactNode => {
        let formattedValue = params.formattedValue;

        if (aggregatedBy === 'service' || aggregatedBy === 'account') {
          // remove provider names
          if (params.formattedValue !== undefined && params.formattedValue.indexOf('/') !== -1) {
            formattedValue = params.formattedValue.split('/')[1];
          }

          if (aggregatedBy === 'account' && formattedValue) {
            const account = extractAccountInfo(formattedValue);
            const accountName = account.accountName;
            const accountId = account.accountId;

            return (
              <div>
                <Typography variant="body2" className={classes.container}>
                  {accountName}
                </Typography>
                <Typography variant="caption" className={classes.container} color="textSecondary">
                  {accountId}
                </Typography>
              </div>
            );
          }
        }

        return (
          <Typography variant="body2" component="div" className={classes.container}>
            {formattedValue}
          </Typography>
        );
      },
    },
    {
      field: 'TREND',
      headerName: 'TREND',
      width: 100,
      disableExport: true,
      hideSortIcons: true,
      renderCell: (params: GridRenderCellParams) => (
        <SparkLineChart data={params.value ? params.value[0] : null} plotType="bar" />
      ),
      valueGetter: (_, row) => [
        periods.map(period => (row.reports[period] !== undefined ? row.reports[period] : null)),
      ],
    },
  );

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
      renderCell: (params: GridRenderCellParams): React.ReactNode => {
        const formattedValue = formatCostValue(params, period);
        let className = '';
        const percentageIndex = formattedValue.indexOf('(');
        const costStr = percentageIndex === -1 ? formattedValue : formattedValue.substring(0, percentageIndex);
        let percentageStr = percentageIndex === -1 ? '' : formattedValue.substring(percentageIndex);
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
    renderCell: (params: GridRenderCellParams): React.ReactNode => {
      let formattedValue = '-';
      if (typeof params.value === 'number') {
        formattedValue = `$${humanFormat(params.value, {
          scale: customScale,
          separator: '',
          decimals: 2,
        })}`;
      }
      return <Typography variant="body2">{formattedValue}</Typography>;
    },
  });

  return (
    <Box>
      <DataGrid
        rows={reports}
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
        pageSizeOptions={[15]}
        slots={{ toolbar: CustomToolbar }}
        disableRowSelectionOnClick
        disableColumnMenu
        density={aggregatedBy === 'account' ? 'standard' : 'compact'}
      />
    </Box>
  );
};
