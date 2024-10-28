import { alertApiRef, configApiRef, useApi } from '@backstage/core-plugin-api';
import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridEditInputCell,
  GridEventListener,
  GridPreProcessEditCellProps,
  GridRenderEditCellParams,
  GridRowEditStopReasons,
  GridRowId,
  GridRowModel,
  GridRowModes,
  GridRowModesModel,
  GridRowsProp,
  GridSlots,
  GridToolbar,
  GridToolbarContainer,
  GridToolbarFilterButton,
  ValueOptions,
} from '@mui/x-data-grid';
import moment from 'moment';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { infraWalletApiRef } from '../../api/InfraWalletApi';
import { CustomCost } from '../../api/types';
import { BulkInsertButton } from './BulkInsertButton';

const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
  },
}));

export const CustomCostsComponent: FC = () => {
  const configApi = useApi(configApiRef);
  const alertApi = useApi(alertApiRef);
  const infraWalletApi = useApi(infraWalletApiRef);
  const [rows, setRows] = useState<GridRowsProp>([]);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

  const readOnly = configApi.getOptionalBoolean('infraWallet.settings.readOnly') ?? false;

  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleCloneClick = (row: any) => () => {
    const uuid = uuidv4();
    setRows(oldRows => [
      {
        id: uuid,
        provider: row.provider,
        account: row.account,
        service: row.service,
        category: row.category,
        amortization_mode: row.amortization_mode,
        usage_month: parseInt(moment(new Date()).format('YYYYMM'), 10),
        cost: 0,
        tags: {},
        isNew: true,
      },
      ...oldRows,
    ]);
    setRowModesModel(oldModel => ({
      ...oldModel,
      [uuid]: { mode: GridRowModes.Edit, fieldToFocus: 'provider' },
    }));
  };

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleDeleteClick = (row: GridRowModel) => () => {
    const { isNew, ...customCost } = row;
    infraWalletApi
      .deleteCustomCost(customCost as CustomCost)
      .then((response: any) => {
        if (response.status === 200) {
          setRows(rows.filter(r => r.id !== row.id));
        } else {
          alertApi.post({ message: 'Failed to delete the custom cost', severity: 'error' });
        }
      })
      .catch(e => alertApi.post({ message: `${e.message}`, severity: 'error' }));
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
    const updatedRow = {
      ...newRow,
      isNew: false,
      account: newRow.account || newRow.provider,
      service: newRow.service || newRow.provider,
      category: newRow.category || 'Uncategorized',
    };
    const { isNew, ...customCost } = updatedRow;

    infraWalletApi
      .updateCustomCost(customCost as CustomCost)
      .then((response: any) => {
        if (response.status === 200) {
          setRows(rows.map(row => (row.id === newRow.id ? updatedRow : row)));
        } else {
          alertApi.post({ message: 'Failed to update the custom cost', severity: 'error' });
        }
      })
      .catch(e => alertApi.post({ message: `${e.message}`, severity: 'error' }));

    return updatedRow;
  };

  const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
    setRowModesModel(newRowModesModel);
  };

  const columns: GridColDef[] = [
    {
      field: 'provider',
      headerName: 'Provider',
      width: 220,
      editable: !readOnly,
      display: 'flex',
    },
    {
      field: 'account',
      headerName: 'Account',
      width: 180,
      editable: !readOnly,
    },
    {
      field: 'service',
      headerName: 'Service',
      width: 220,
      editable: !readOnly,
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 200,
      editable: !readOnly,
      renderEditCell: (params: GridRenderEditCellParams) => (
        <Autocomplete
          fullWidth
          freeSolo
          options={[
            'Uncategorized',
            'Analytics',
            'Application Integration',
            'Cloud Financial Management',
            'Compute',
            'Containers',
            'Database',
            'Developer Tools',
            'Front-End Web & Mobile',
            'Internet of Things',
            'Management & Governance',
            'Migration',
            'Networking',
            'Security, Identity, & Compliance',
            'Storage',
          ]}
          onChange={(_, value) => params.api.setEditCellValue({ id: params.id, field: params.field, value: value })}
          renderInput={p => (
            <TextField
              {...p}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                params.api.setEditCellValue({ id: params.id, field: params.field, value: event.target.value })
              }
            />
          )}
        />
      ),
    },
    {
      field: 'amortization_mode',
      headerName: 'Amortization Mode',
      width: 150,
      editable: !readOnly,
      type: 'singleSelect',
      valueOptions: (_params: any) => {
        const options: ValueOptions[] = [
          { value: 'average', label: 'Average' },
          { value: 'start_day', label: 'Start day of the month' },
          { value: 'end_day', label: 'End day of the month' },
        ];
        return options;
      },
    },
    {
      field: 'usage_month',
      headerName: 'Usage Month',
      width: 150,
      editable: !readOnly,
    },
    {
      field: 'cost',
      headerName: 'Cost',
      width: 100,
      editable: !readOnly,
      type: 'number',
    },
    {
      field: 'tags',
      headerName: 'Tags (in JSON)',
      display: 'flex',
      flex: 1,
      editable: !readOnly,
      sortable: false,
      renderCell: (params: { row: { tags?: Record<string, string> } }) => {
        const tags = params.row.tags || {};
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {Object.entries(tags).map(([key, value]) => (
              <Chip key={key} label={`${key}:${value}`} size="small" />
            ))}
          </div>
        );
      },
      valueGetter: (params: any): string => {
        return JSON.stringify(params);
      },
      valueSetter: (value: string, row: any) => {
        let tags = null;
        if (value) {
          try {
            tags = JSON.parse(value);
          } catch (e) {
            // Invalid JSON
          }
        }
        return { ...row, tags };
      },
      preProcessEditCellProps: (params: GridPreProcessEditCellProps) => {
        let errorMsg = null;
        if (params.props.value) {
          try {
            JSON.parse(params.props.value);
          } catch (e) {
            errorMsg = 'Invalid JSON format. Please use key-value pairs in JSON format, e.g. {"key1":"value1"}';
          }
        }
        return { ...params.props, error: errorMsg };
      },
      renderEditCell: (props: GridRenderEditCellParams) => {
        const { error } = props;

        return (
          <StyledTooltip open={!!error} title={error}>
            <GridEditInputCell {...props} />
          </StyledTooltip>
        );
      },
    },
  ];

  if (!readOnly) {
    columns.push({
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
            icon={<ContentCopyIcon />}
            label="Clone"
            className="textPrimary"
            onClick={handleCloneClick(row)}
            color="inherit"
          />,
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
    });
  }

  const getCustomCosts = useCallback(async () => {
    await infraWalletApi
      .getCustomCosts()
      .then(customCostsResponse => {
        if (customCostsResponse.data && customCostsResponse.status === 200) {
          setRows(customCostsResponse.data);
        }
      })
      .catch(e => alertApi.post({ message: `${e.message}`, severity: 'error' }));
  }, [infraWalletApi, alertApi]);

  function EditToolbar() {
    const handleClick = () => {
      const id = uuidv4();
      setRows(oldRows => [
        {
          id: id,
          provider: '',
          account: '',
          service: '',
          category: '',
          amortization_mode: 'average',
          usage_month: parseInt(moment(new Date()).format('YYYYMM'), 10),
          cost: 0,
          tags: {},
          isNew: true,
        },
        ...oldRows,
      ]);
      setRowModesModel(oldModel => ({
        ...oldModel,
        [id]: { mode: GridRowModes.Edit, fieldToFocus: 'provider' },
      }));
    };

    return (
      <GridToolbarContainer>
        <Button color="primary" startIcon={<AddIcon />} onClick={handleClick}>
          Add custom cost
        </Button>
        <BulkInsertButton reloadFunction={getCustomCosts} />
        <GridToolbarFilterButton />
      </GridToolbarContainer>
    );
  }
  useEffect(() => {
    getCustomCosts();
  }, [getCustomCosts]);

  return (
    <Box
      sx={{
        height: 700,
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
        initialState={{
          sorting: {
            sortModel: [{ field: 'usage_month', sort: 'desc' }],
          },
        }}
        slots={{
          toolbar: readOnly ? GridToolbar : (EditToolbar as GridSlots['toolbar']),
        }}
      />
    </Box>
  );
};
