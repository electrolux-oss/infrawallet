import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import AddIcon from '@material-ui/icons/Add';
import CancelIcon from '@material-ui/icons/Close';
import DeleteIcon from '@material-ui/icons/DeleteOutlined';
import EditIcon from '@material-ui/icons/Edit';
import SaveIcon from '@material-ui/icons/Save';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { infraWalletApiRef } from '../../api/InfraWalletApi';
import { MetricConfig, MetricSetting, Wallet } from '../../api/types';

import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridEventListener,
  GridRowEditStopReasons,
  GridRowId,
  GridRowModel,
  GridRowModes,
  GridRowModesModel,
  GridRowsProp,
  GridSlots,
  GridToolbarContainer,
  ValueOptions,
} from '@mui/x-data-grid';

export const MetricConfigurationComponent: FC<{ wallet?: Wallet }> = ({ wallet }) => {
  const alertApi = useApi(alertApiRef);
  const infraWalletApi = useApi(infraWalletApiRef);
  const [rows, setRows] = useState<GridRowsProp>([]);
  const [metricConfigs, setMetricConfigs] = useState<MetricConfig[]>();
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

  function EditToolbar() {
    const handleClick = () => {
      const id = uuidv4();
      setRows(oldRows => [
        ...oldRows,
        {
          id,
          wallet_id: wallet ? wallet.id : '',
          metric_provider: '',
          config_name: '',
          metric_name: '',
          description: '',
          query: '',
          isNew: true,
        },
      ]);
      setRowModesModel(oldModel => ({
        ...oldModel,
        [id]: { mode: GridRowModes.Edit, fieldToFocus: 'name' },
      }));
    };

    return (
      <GridToolbarContainer>
        <Button color="primary" startIcon={<AddIcon />} onClick={handleClick}>
          Add metric
        </Button>
      </GridToolbarContainer>
    );
  }

  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleDeleteClick = (row: GridRowModel) => () => {
    if (wallet) {
      const { isNew, ...metricSetting } = row;
      infraWalletApi
        .deleteWalletMetricSetting(wallet.name, metricSetting as MetricSetting)
        .then(response => {
          if (response.status === 200) {
            setRows(rows.filter(r => r.id !== row.id));
          } else {
            alertApi.post({ message: 'Failed to update the metric setting', severity: 'error' });
          }
        })
        .catch(e => alertApi.post({ message: `${e.message}`, severity: 'error' }));
    }
  };

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });

    const editedRow = rows.find(row => row.id === id);
    if (editedRow!.isNew) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const processRowUpdate = (newRow: GridRowModel) => {
    const updatedRow = { ...newRow, isNew: false };
    if (wallet) {
      const { isNew, ...metricSetting } = updatedRow;

      infraWalletApi
        .updateWalletMetricSetting(wallet.name, metricSetting as MetricSetting)
        .then(response => {
          if (response.status === 200) {
            setRows(rows.map(row => (row.id === newRow.id ? updatedRow : row)));
          } else {
            alertApi.post({ message: 'Failed to update the metric setting', severity: 'error' });
          }
        })
        .catch(e => alertApi.post({ message: `${e.message}`, severity: 'error' }));
    }

    return updatedRow;
  };

  const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
    setRowModesModel(newRowModesModel);
  };

  const columns: GridColDef[] = [
    {
      field: 'metric_provider',
      headerName: 'Provider',
      width: 220,
      editable: true,
      type: 'singleSelect',
      valueOptions: () => {
        const options: ValueOptions[] = [];
        const optionsSet = new Set<string>();

        if (metricConfigs) {
          metricConfigs.forEach(c => {
            optionsSet.add(c.metric_provider);
          });
        }
        optionsSet.forEach(o => options.push({ value: o, label: o }));
        return options;
      },
    },
    {
      field: 'config_name',
      headerName: 'ConfigName',
      width: 180,
      editable: true,
      type: 'singleSelect',
      valueOptions: params => {
        const options: ValueOptions[] = [];
        if (params.row.metric_provider !== '' && metricConfigs) {
          metricConfigs.forEach(c => {
            if (params.row.metric_provider === c.metric_provider) {
              options.push({ value: c.config_name, label: c.config_name });
            }
          });
        }
        return options;
      },
    },
    {
      field: 'metric_name',
      headerName: 'MetricName',
      width: 220,
      editable: true,
    },
    {
      field: 'description',
      headerName: 'Description',
      width: 220,
      editable: true,
    },
    {
      field: 'query',
      headerName: 'Query',
      flex: 1,
      editable: true,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ id, row }) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

        if (isInEditMode) {
          return [
            <GridActionsCellItem
              icon={<SaveIcon />}
              label="Save"
              sx={{
                color: 'primary.main',
              }}
              onClick={handleSaveClick(id)}
            />,
            <GridActionsCellItem
              icon={<CancelIcon />}
              label="Cancel"
              className="textPrimary"
              onClick={handleCancelClick(id)}
              color="inherit"
            />,
          ];
        }

        return [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit"
            className="textPrimary"
            onClick={handleEditClick(id)}
            color="inherit"
          />,
          <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={handleDeleteClick(row)} color="inherit" />,
        ];
      },
    },
  ];

  const getWalletMetricSettings = useCallback(async () => {
    if (wallet) {
      await infraWalletApi
        .getWalletMetricsSetting(wallet.name)
        .then(metricsResponse => {
          if (metricsResponse.data && metricsResponse.status === 200) {
            setRows(metricsResponse.data);
          }
        })
        .catch(e => alertApi.post({ message: `${e.message}`, severity: 'error' }));
    }
  }, [wallet, infraWalletApi, alertApi]);

  const getMetricConfig = useCallback(async () => {
    await infraWalletApi
      .getMetricConfigs()
      .then(response => {
        if (response.data && response.status === 200) {
          setMetricConfigs(response.data);
        }
      })
      .catch(e => alertApi.post({ message: `${e.message}`, severity: 'error' }));
  }, [alertApi, infraWalletApi]);

  useEffect(() => {
    getWalletMetricSettings();
    getMetricConfig();
  }, [getWalletMetricSettings, getMetricConfig]);

  return (
    <Box
      sx={{
        height: 500,
        width: '100%',
        '& .actions': {
          color: 'text.secondary',
        },
        '& .textPrimary': {
          color: 'text.primary',
        },
      }}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        editMode="row"
        rowModesModel={rowModesModel}
        onRowModesModelChange={handleRowModesModelChange}
        onRowEditStop={handleRowEditStop}
        processRowUpdate={processRowUpdate}
        slots={{
          toolbar: EditToolbar as GridSlots['toolbar'],
        }}
      />
    </Box>
  );
};
