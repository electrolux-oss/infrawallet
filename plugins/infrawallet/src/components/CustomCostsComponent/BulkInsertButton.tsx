import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import LibraryAddOutlinedIcon from '@mui/icons-material/LibraryAddOutlined';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import moment from 'moment';
import * as React from 'react';
import { infraWalletApiRef } from '../../api/InfraWalletApi';
import { CustomCost } from '../../api/types';

type BulkCustomCost = {
  provider: string;
  account: string;
  service: string;
  category: string;
  from: Date;
  to: Date;
  monthlyCost: number;
};

export const BulkInsertButton = (prop: { reloadFunction: any }) => {
  const infraWalletApi = useApi(infraWalletApiRef);
  const alertApi = useApi(alertApiRef);
  const [open, setOpen] = React.useState(false);
  const [submittingForm, setSubmittingForm] = React.useState(false);
  const [bulkCustomCost, setBulkCustomCost] = React.useState<BulkCustomCost>({
    provider: '',
    account: '',
    service: '',
    category: '',
    from: new Date(),
    to: new Date(),
    monthlyCost: 0,
  });

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    prop.reloadFunction();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBulkCustomCost({ ...bulkCustomCost, [event.target.name]: event.target.value });
  };

  const generateRecords = (): CustomCost[] => {
    const fromDate = moment(bulkCustomCost.from);
    const toDate = moment(bulkCustomCost.to);
    const records = [];

    const currentDate = fromDate.clone();

    while (currentDate.isSameOrBefore(toDate, 'month')) {
      const newRecord: CustomCost = {
        provider: bulkCustomCost.provider,
        account: bulkCustomCost.account || bulkCustomCost.provider,
        service: bulkCustomCost.service || bulkCustomCost.provider,
        category: bulkCustomCost.category || 'Uncategorized',
        currency: 'USD',
        amortization_mode: 'average',
        usage_month: parseInt(currentDate.format('YYYYMM'), 10),
        cost: bulkCustomCost.monthlyCost,
      };
      records.push(newRecord);
      currentDate.add(1, 'month');
    }

    return records;
  };

  const handleSubmit = (event: React.FormEvent<HTMLDivElement>) => {
    event.preventDefault();
    setSubmittingForm(true);
    const records = generateRecords();
    infraWalletApi
      .createCustomCosts(records)
      .then((response: any) => {
        if (response.status === 200) {
          alertApi.post({ message: 'Custom costs created', severity: 'info' });
          setSubmittingForm(false);
          setOpen(false);
          prop.reloadFunction();
        } else {
          alertApi.post({ message: 'Failed to bulk insert the custom costs', severity: 'error' });
          setSubmittingForm(false);
        }
      })
      .catch(e => alertApi.post({ message: `${e.message}`, severity: 'error' }));
  };

  return (
    <React.Fragment>
      <Button startIcon={<LibraryAddOutlinedIcon />} onClick={handleClickOpen}>
        Bulk Add
      </Button>
      <Dialog component="form" fullWidth maxWidth="md" open={open} onClose={handleClose} onSubmit={handleSubmit}>
        <DialogTitle>Bulk Add Custom Costs</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bulk add Custom Costs for the same provider/account/service, e.g., for an annual contract.
          </DialogContentText>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ m: 1 }}>
                <TextField
                  id="provider-input"
                  name="provider"
                  variant="standard"
                  label="Provider"
                  value={bulkCustomCost.provider}
                  onChange={handleChange}
                  required
                />
              </FormControl>
              <Grid container>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ m: 1 }}>
                    <TextField
                      id="account-input"
                      name="account"
                      variant="standard"
                      label="Account"
                      value={bulkCustomCost.account}
                      onChange={handleChange}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ m: 1 }}>
                    <TextField
                      id="service-input"
                      name="service"
                      variant="standard"
                      label="Service"
                      value={bulkCustomCost.service}
                      onChange={handleChange}
                    />
                  </FormControl>
                </Grid>
              </Grid>
              <FormControl fullWidth sx={{ m: 1 }}>
                <Autocomplete
                  id="category-input"
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
                  onChange={(_, value) => setBulkCustomCost({ ...bulkCustomCost, category: value as string })}
                  renderInput={params => (
                    <TextField
                      {...params}
                      name="category"
                      variant="standard"
                      label="Category"
                      onChange={handleChange}
                    />
                  )}
                />
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ m: 1 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    value={bulkCustomCost.from}
                    label="From"
                    views={['year', 'month']}
                    slotProps={{ textField: { variant: 'standard' } }}
                    onAccept={value => {
                      if (value) {
                        setBulkCustomCost({ ...bulkCustomCost, from: value });
                      }
                    }}
                  />
                </LocalizationProvider>
              </FormControl>
              <FormControl fullWidth sx={{ m: 1 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    value={bulkCustomCost.to}
                    label="To"
                    views={['year', 'month']}
                    slotProps={{ textField: { variant: 'standard' } }}
                    onAccept={value => {
                      if (value) {
                        setBulkCustomCost({ ...bulkCustomCost, to: value });
                      }
                    }}
                  />
                </LocalizationProvider>
              </FormControl>
              <FormControl fullWidth sx={{ m: 1 }}>
                <TextField
                  id="monthly-cost-input"
                  name="monthlyCost"
                  variant="standard"
                  type="number"
                  label="Monthly Cost"
                  value={bulkCustomCost.monthlyCost}
                  onChange={handleChange}
                />
              </FormControl>
            </Grid>
            {bulkCustomCost.provider && (
              <Grid item xs={12} md={12}>
                <Alert severity="info">{generateRecords().length} record(s) will be added.</Alert>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Provider</TableCell>
                        <TableCell>Account</TableCell>
                        <TableCell>Service</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell align="right">Usage Month</TableCell>
                        <TableCell align="right">Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {generateRecords().map(row => (
                        <TableRow key={row.usage_month} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell component="th" scope="row">
                            {row.provider}
                          </TableCell>
                          <TableCell>{row.account}</TableCell>
                          <TableCell>{row.service}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell align="right">{row.usage_month}</TableCell>
                          <TableCell align="right">{row.cost}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" type="submit" disabled={submittingForm}>
            Submit
          </Button>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
};
