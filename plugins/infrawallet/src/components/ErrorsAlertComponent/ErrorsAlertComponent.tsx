import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import CloseIcon from '@material-ui/icons/Close';
import Alert from '@material-ui/lab/Alert';
import AlertTitle from '@material-ui/lab/AlertTitle';
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
