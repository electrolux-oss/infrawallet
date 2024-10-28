import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useTheme } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import React, { FC } from 'react';
import { TopbarComponentProps } from '../types';

export const TopbarComponent: FC<TopbarComponentProps> = ({
  aggregatedBy,
  aggregatedBySetter,
  tags,
  monthRange,
  monthRangeSetter,
}) => {
  const theme = useTheme();
  const setPreDefinedMonthRange = (lastXMonth: number) => {
    monthRangeSetter({
      startMonth: startOfMonth(addMonths(new Date(), lastXMonth * -1)),
      endMonth: endOfMonth(new Date()),
    });
  };

  return (
    <Box>
      <FormControl sx={{ marginLeft: theme.spacing(1), marginRight: theme.spacing(3), minWidth: 120 }}>
        <InputLabel variant="standard">Group by</InputLabel>
        <Select variant="standard" value={aggregatedBy} onChange={event => aggregatedBySetter(event.target.value)}>
          <MenuItem value="none">
            <em>None</em>
          </MenuItem>
          <MenuItem value="account">Account</MenuItem>
          <MenuItem value="provider">Provider</MenuItem>
          <MenuItem value="category">Category</MenuItem>
          <MenuItem value="service">Service</MenuItem>
          <Divider />
          <ListSubheader onClickCapture={e => e.stopPropagation()}>Tags</ListSubheader>
          {tags.map(tag => (
            <MenuItem key={tag} value={tag}>
              {`tag:${tag}`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ marginLeft: theme.spacing(1), marginRight: theme.spacing(3), minWidth: 120 }}>
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

      <FormControl sx={{ marginLeft: theme.spacing(1), marginRight: theme.spacing(3), minWidth: 120 }}>
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

      <FormControl sx={{ marginLeft: theme.spacing(1), marginRight: theme.spacing(3), minWidth: 120 }}>
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
