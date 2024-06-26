import { Box, Chip, FormControl, Input, InputAdornment } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { debounce } from 'lodash';
import React, { FC } from 'react';
import { QueryComponentProps } from '../types';

const useStyles = makeStyles(theme => ({
  formControl: {
    marginTop: theme.spacing(1),
    minWidth: 120,
  },
}));

export const QueryComponent: FC<QueryComponentProps> = ({ filters, filtersSetter, groups, groupsSetter }) => {
  const classes = useStyles();
  const debouncedFiltersSetter = debounce(filtersSetter, 500);
  const debouncedGroupsSetter = debounce(groupsSetter, 500);

  return (
    <Box>
      <FormControl fullWidth className={classes.formControl}>
        <Input
          id="filters"
          defaultValue={filters}
          onChange={event => debouncedFiltersSetter(event.target.value)}
          startAdornment={
            <InputAdornment position="start">
              <Chip label="Filters" />
            </InputAdornment>
          }
        />
      </FormControl>

      <FormControl fullWidth className={classes.formControl}>
        <Input
          id="group_by"
          defaultValue={groups}
          onChange={event => debouncedGroupsSetter(event.target.value)}
          startAdornment={
            <InputAdornment position="start">
              <Chip label="Group by" />
            </InputAdornment>
          }
        />
      </FormControl>
    </Box>
  );
};
