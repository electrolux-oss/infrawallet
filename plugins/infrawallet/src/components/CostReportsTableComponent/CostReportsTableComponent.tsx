import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';
import {
  DataGrid,
  GridColDef,
  GridColumnGroupingModel,
  GridRenderCellParams,
  GridToolbarContainer,
  GridToolbarExport,
} from '@mui/x-data-grid';
import React, { FC } from 'react';
import { extractAccountInfo, formatCurrency, getPreviousDay, getPreviousMonth } from '../../api/functions';
import { getProviderIcon } from '../ProviderIcons';
import { CostReportsTableComponentProps } from '../types';

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
  let rows: any[] | undefined = reports;
  const columns: GridColDef[] = [];
  const columnTotals: { [key: string]: number } = {};
  const columnGroupingModel: GridColumnGroupingModel = [];

  if (reports && aggregatedBy !== 'none') {
    for (const period of periods) {
      for (const report of reports) {
        if (columnTotals[period] === undefined) {
          columnTotals[period] = 0;
        }

        columnTotals[period] += report.reports[period] || 0;
      }
    }

    rows = [...reports, { id: 'Total', reports: columnTotals }];
  }

  if (['account', 'provider', 'service'].includes(aggregatedBy)) {
    // provider icon column
    columns.push({
      field: 'icon',
      headerName: '',
      width: 30,
      display: 'flex',
      disableExport: true,
      sortable: false,
      renderCell: (params: GridRenderCellParams): React.ReactNode => {
        if (params.id === 'Total') {
          return undefined;
        }

        return <div>{getProviderIcon(params.row.provider)}</div>;
      },
    });
  }

  columns.push(
    // groupBy column
    {
      field: aggregatedBy,
      headerName: aggregatedBy === 'none' ? '' : aggregatedBy.charAt(0).toUpperCase() + aggregatedBy.slice(1),
      minWidth: 200,
      display: 'flex',
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
                <Typography variant="body2">{accountName}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {accountId}
                </Typography>
              </div>
            );
          }
        }

        if (params.id === 'Total') {
          return <div style={{ fontWeight: 'bold' }}>Total</div>;
        }

        return <div>{formattedValue}</div>;
      },
      sortComparator: (value1, value2, params1, params2) => {
        if (params1.id === 'Total' || params2.id === 'Total') {
          return 0;
        }
        return value1 - value2;
      },
    },
    // trend line column
    {
      field: 'trend',
      headerName: 'Trend',
      width: 100,
      display: 'flex',
      disableExport: true,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <SparkLineChart data={params.value ? params.value[0] : null} plotType="bar" />
      ),
      valueGetter: (_, row) => [
        periods.map(period => (row.reports[period] !== undefined ? row.reports[period] : null)),
      ],
    },
    // total column
    {
      field: 'total',
      headerName: 'Total',
      type: 'number',
      minWidth: 150,
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
          formattedValue = formatCurrency(params.value);
        }
        return <div style={{ fontWeight: 'bold' }}>{formattedValue}</div>;
      },
      sortComparator: (value1, value2, params1, params2) => {
        if (params1.id === 'Total' || params2.id === 'Total') {
          return 0;
        }
        return value1 - value2;
      },
    },
  );

  periods.forEach(period => {
    columns.push(
      // cost column
      {
        field: `cost-${period}`,
        headerName: 'Cost',
        type: 'number',
        valueGetter: (_, row) => {
          return row.reports[period] ? row.reports[period] : null;
        },
        renderCell: (params: GridRenderCellParams): React.ReactNode => {
          const value = params.value;
          let cost = '-';

          if (typeof value === 'number') {
            cost = formatCurrency(value);
          }

          return (
            <div>
              <span style={{ fontWeight: params.id === 'Total' ? 'bold' : 'normal' }}>{cost}</span>
            </div>
          );
        },
        sortComparator: (value1, value2, params1, params2) => {
          if (params1.id === 'Total' || params2.id === 'Total') {
            return 0;
          }
          return value1 - value2;
        },
      },
      // change% column
      {
        field: `change-${period}`,
        headerName: 'Change',
        disableExport: true,
        sortable: false,
        renderCell: (params: GridRenderCellParams): React.ReactNode => {
          let percentage = undefined;
          const previousPeriod = period.length === 7 ? getPreviousMonth(period) : getPreviousDay(period);
          if (
            params.row.reports[period] &&
            periods.includes(previousPeriod) &&
            params.row.reports[previousPeriod] > 0
          ) {
            const diff = params.row.reports[period] - params.row.reports[previousPeriod];
            percentage = Math.round((diff / params.row.reports[previousPeriod]) * 100);
          }

          if (percentage === undefined) {
            return (
              <div>
                <span>-</span>
              </div>
            );
          }

          let color = '#0052cc';
          let backgroundColor = '#e9f2ff';
          let mark = '';
          if (percentage < 0) {
            color = '#216e4e';
            backgroundColor = '#dcfff1';
            mark = '▼';
          } else if (percentage > 0) {
            color = '#ae2e24';
            backgroundColor = '#ffeceb';
            mark = '▲';
          }

          return (
            <div>
              <span
                style={{
                  fontSize: '0.82em',
                  paddingInline: '2px',
                  borderRadius: '4px',
                  color: color,
                  backgroundColor: backgroundColor,
                }}
              >
                {mark}
                {Math.abs(percentage).toLocaleString()}%
              </span>
            </div>
          );
        },
      },
    );

    columnGroupingModel.push({
      groupId: period,
      children: [{ field: `cost-${period}` }, { field: `change-${period}` }],
      headerAlign: 'center',
    });
  });

  return (
    <Box sx={{ height: 700 }}>
      <DataGrid
        loading={rows === undefined}
        rows={rows}
        columns={columns}
        columnGroupingModel={columnGroupingModel}
        initialState={{
          sorting: {
            sortModel: [{ field: 'total', sort: 'desc' }],
          },
          pagination: {
            paginationModel: {
              pageSize: 15,
            },
          },
        }}
        pageSizeOptions={[15]}
        slots={{ toolbar: CustomToolbar }}
        slotProps={{
          loadingOverlay: {
            variant: 'skeleton',
            noRowsVariant: 'skeleton',
          },
        }}
        disableRowSelectionOnClick
        disableColumnMenu
        density={aggregatedBy === 'account' ? 'standard' : 'compact'}
      />
    </Box>
  );
};
