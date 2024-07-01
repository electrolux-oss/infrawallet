import { Box, FormControl } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import TextField from '@material-ui/core/TextField';
import { makeStyles } from '@material-ui/core/styles';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import Autocomplete from '@material-ui/lab/Autocomplete';
import React, { FC } from 'react';
import { getReportKeyAndValues } from '../../api/functions';
import { FiltersComponentProps } from '../types';

const useStyles = makeStyles(theme => ({
  formControl: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(3),
    width: 300,
  },
}));
const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

export const FiltersComponent: FC<FiltersComponentProps> = ({ reports, filters, filtersSetter }) => {
  const classes = useStyles();
  const keyValues: { [key: string]: string[] } = getReportKeyAndValues(reports);
  const handleFiltersChange = (key: string, newValue: string[]): void => {
    filtersSetter({ ...filters, [key]: newValue });
  };

  return (
    <Box>
      {Object.keys(keyValues).map(key => (
        <FormControl className={classes.formControl} key={`form-${key}`}>
          <Autocomplete
            multiple
            id={`checkboxes-${key}`}
            options={keyValues[key]}
            value={filters[key] || []}
            onChange={(_event, value: string[], _reason) => handleFiltersChange(key, value)}
            disableCloseOnSelect
            renderOption={(option, { selected }) => (
              <React.Fragment key={`option-${option}`}>
                <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 8 }} checked={selected} />
                {option}
              </React.Fragment>
            )}
            renderInput={params => <TextField {...params} variant="standard" label={key} />}
          />
        </FormControl>
      ))}
      <FormControl className={classes.formControl} style={{ marginTop: 10 }}>
        <Button variant="contained" color="primary" onClick={() => filtersSetter({})}>
          Clear filters
        </Button>
      </FormControl>
    </Box>
  );
};
