import { Box, Button, FormControl, FormHelperText, Grid, MenuItem, Select } from '@material-ui/core';
import Divider from '@material-ui/core/Divider';
import InputLabel from '@material-ui/core/InputLabel';
import ListSubheader from '@material-ui/core/ListSubheader';
import { makeStyles } from '@material-ui/core/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import React, { FC } from 'react';
import { TopbarComponentProps } from '../types';

const useStyles = makeStyles(theme => ({
  formControl: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(3),
    minWidth: 120,
  },
}));

export const TopbarComponent: FC<TopbarComponentProps> = ({
  aggregatedBy,
  aggregatedBySetter,
  tags,
  monthRange,
  monthRangeSetter,
}) => {
  const classes = useStyles();

  const setPreDefinedMonthRange = (lastXMonth: number) => {
    monthRangeSetter({
      startMonth: startOfMonth(addMonths(new Date(), lastXMonth * -1)),
      endMonth: endOfMonth(new Date()),
    });
  };

  return (
    <Box>
      <FormControl className={classes.formControl}>
        <InputLabel shrink>Group by</InputLabel>
        <Select value={aggregatedBy} onChange={event => aggregatedBySetter(event.target.value)}>
          <MenuItem value="none">
            <em>None</em>
          </MenuItem>
          <MenuItem value="account">Account</MenuItem>
          <MenuItem value="provider">Provider</MenuItem>
          <MenuItem value="category">Category</MenuItem>
          <MenuItem value="service">Service</MenuItem>
          <Divider light />
          <ListSubheader onClickCapture={e => e.stopPropagation()}>Tags</ListSubheader>
          {tags.map(tag => (
            <MenuItem key={tag} value={tag}>
              {`tag:${tag}`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl className={classes.formControl}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            value={monthRange.startMonth}
            label="From"
            views={['year', 'month']}
            slotProps={{ textField: { variant: 'standard' } }}
            onAccept={value => {
              if (value) {
                monthRangeSetter({
                  startMonth: startOfMonth(value),
                  endMonth: endOfMonth(monthRange.endMonth),
                });
              }
            }}
          />
        </LocalizationProvider>
      </FormControl>

      <FormControl className={classes.formControl}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            value={monthRange.endMonth}
            label="To"
            views={['year', 'month']}
            slotProps={{ textField: { variant: 'standard' } }}
            onAccept={value => {
              if (value) {
                monthRangeSetter({
                  startMonth: startOfMonth(monthRange.startMonth),
                  endMonth: endOfMonth(value),
                });
              }
            }}
          />
        </LocalizationProvider>
      </FormControl>

      <FormControl className={classes.formControl}>
        <FormHelperText>Quick selections for month ranges</FormHelperText>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Button color="primary" onClick={() => setPreDefinedMonthRange(2)}>
              Last 3 Months
            </Button>
            <Button color="primary" onClick={() => setPreDefinedMonthRange(5)}>
              Last 6 Months
            </Button>
            <Button color="primary" onClick={() => setPreDefinedMonthRange(11)}>
              Last 12 Months
            </Button>
          </Grid>
        </Grid>
      </FormControl>
    </Box>
  );
};
