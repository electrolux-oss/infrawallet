import CloseIcon from '@mui/icons-material/Close';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import React, { FC } from 'react';
import { CloudProviderError } from '../../api/types';

export const ErrorsAlertComponent: FC<{ errors: CloudProviderError[] }> = ({ errors }) => {
  const [open, setOpen] = React.useState(true);

  return (
    <Collapse in={open}>
      <Alert
        severity="warning"
        style={{ maxHeight: '300px', overflow: 'auto' }}
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={() => {
              setOpen(false);
            }}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        }
      >
        <AlertTitle>InfraWallet failed to fetch data from some accounts. Here is the list of errors.</AlertTitle>
        <TableContainer component={Paper}>
          <Table aria-label="errors table">
            <TableHead>
              <TableRow>
                <TableCell style={{ minWidth: '150px' }}>Account/Integration</TableCell>
                <TableCell>Error Message</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {errors.map(row => (
                <TableRow key={row.name}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.error}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Alert>
    </Collapse>
  );
};
