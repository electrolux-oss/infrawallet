import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Theme, useTheme } from '@mui/material/styles';
import { withStyles } from '@mui/styles';
import React, { FC, useEffect, useState } from 'react';
import { infraWalletApiRef } from '../../api/InfraWalletApi';
import { extractAccountInfo, extractProvider, getReportKeyAndValues, tagExists } from '../../api/functions';
import { Tag } from '../../api/types';
import { getProviderIcon } from '../ProviderIcons';
import { FiltersComponentProps } from '../types';

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

const HtmlTooltip = withStyles((theme: Theme) => ({
  tooltip: {
    backgroundColor: '#f5f5f9',
    color: 'rgba(0, 0, 0, 0.87)',
    maxWidth: 400,
    fontSize: theme.typography.pxToRem(14),
    border: '1px solid #dadde9',
  },
}))(Tooltip);

export const FiltersComponent: FC<FiltersComponentProps> = ({
  reports,
  filters,
  monthRange,
  filtersSetter,
  selectedTagsSetter,
  providerErrorsSetter,
}) => {
  const theme = useTheme();
  const keyValues: { [key: string]: string[] } = getReportKeyAndValues(reports);

  // tag providers
  const [tagProviders, _setTagProviders] = useState<string[]>(['AWS', 'Azure']);
  const [tagProvider, setTagProvider] = useState<string>();

  // tag keys
  const [openTagKey, setOpenTagKey] = useState(false);
  const [tagKeys, setTagKeys] = useState<Tag[] | undefined>(undefined);
  const [selectedTagKey, setSelectedTagKey] = useState<Tag | undefined>(undefined);
  const [resetTagKeys, setResetTagKeys] = useState(false);
  const loadingTagKeys = openTagKey && tagKeys === undefined;

  // tag values
  const [openTagValue, setOpenTagValue] = useState(false);
  const [tagValues, setTagValues] = useState<Tag[] | undefined>(undefined);
  const [resetTagValues, setResetTagValues] = useState(false);
  const loadingTagValues = openTagValue && tagValues === undefined;

  // user selected tags
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  const infraWalletApi = useApi(infraWalletApiRef);
  const alertApi = useApi(alertApiRef);

  const handleFiltersChange = (key: string, newValue: string[]): void => {
    filtersSetter({ ...filters, [key]: newValue });
  };

  const handleTagProviderChange = (provider: string | null) => {
    setTagProvider('');
    setOpenTagKey(false);
    setResetTagKeys(prev => !prev);
    setTagKeys(undefined);
    setSelectedTagKey(undefined);
    setOpenTagValue(false);
    setTagValues([]);

    if (provider) {
      setTagProvider(provider);
      setOpenTagKey(true);
    }
  };

  const handleTagKeyChange = (tagKey: Tag | string | null) => {
    setSelectedTagKey(undefined);
    setTagValues(undefined);
    setResetTagValues(prev => !prev);

    if (typeof tagKey === 'string') {
      return;
    }

    if (tagKey) {
      setSelectedTagKey(tagKey);
      setOpenTagValue(true);
    }
  };

  const handleTagValueSelection = (tag: Tag | string | null) => {
    if (typeof tag === 'string') {
      return;
    }

    if (tag && !tagExists(selectedTags, tag)) {
      setResetTagValues(prev => !prev);
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleDeleteTag = (tagToDelete: Tag) => () => {
    setSelectedTags(
      selectedTags.filter(
        tag =>
          !(tag.provider === tagToDelete.provider && tag.key === tagToDelete.key && tag.value === tagToDelete.value),
      ),
    );
  };

  useEffect(() => {
    if (!loadingTagKeys) {
      return;
    }

    (async () => {
      if (tagProvider) {
        await infraWalletApi
          .getTagKeys(tagProvider, monthRange.startMonth, monthRange.endMonth)
          .then(response => {
            if (response.data) {
              setTagKeys(response.data);
            }
            if (response.status === 207 && response.errors) {
              providerErrorsSetter(response.errors);
            }
          })
          .catch(e => alertApi.post({ message: `${e.message}`, severity: 'error' }));
      }
    })();
  }, [loadingTagKeys, tagProvider, monthRange, infraWalletApi, alertApi, providerErrorsSetter]);

  useEffect(() => {
    if (!loadingTagValues) {
      return;
    }

    (async () => {
      if (selectedTagKey) {
        await infraWalletApi
          .getTagValues(selectedTagKey, monthRange.startMonth, monthRange.endMonth)
          .then(response => {
            if (response.data) {
              setTagValues(response.data);
            }
            if (response.status === 207 && response.errors) {
              providerErrorsSetter(response.errors);
            }
          })
          .catch(e => alertApi.post({ message: `${e.message}`, severity: 'error' }));
      }
    })();
  }, [loadingTagValues, selectedTagKey, monthRange, infraWalletApi, alertApi, providerErrorsSetter]);

  return (
    <Grid container>
      <Grid item xs={12}>
        {Object.keys(keyValues).map(key => (
          <FormControl
            key={`form-${key}`}
            sx={{ marginLeft: theme.spacing(1), marginRight: theme.spacing(3), minWidth: 300 }}
          >
            <Autocomplete
              multiple
              id={`checkboxes-${key}`}
              options={keyValues[key]}
              value={filters[key] || []}
              onChange={(_event, value: string[], _reason) => handleFiltersChange(key, value)}
              disableCloseOnSelect
              renderOption={(props, option, { selected }) => {
                let provider = undefined;
                let providerIcon = undefined;
                let accountName = undefined;
                let accountId = undefined;
                if (key === 'provider') {
                  provider = option;
                  providerIcon = getProviderIcon(provider);
                } else if (['account', 'service'].includes(key)) {
                  provider = extractProvider(option);
                  providerIcon = getProviderIcon(provider);
                }

                if (key === 'account') {
                  const account = extractAccountInfo(option.replace(`${provider}/`, ''));
                  accountName = account.accountName;
                  accountId = account.accountId;
                }

                return (
                  <li {...props} key={option}>
                    <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 8 }} checked={selected} />
                    {providerIcon && <>{providerIcon}&nbsp;&nbsp;</>}
                    {key === 'account' ? (
                      <div>
                        <Typography variant="body2">{accountName}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {accountId}
                        </Typography>
                      </div>
                    ) : (
                      <Typography variant="body2">{option.replace(`${provider}/`, '')}</Typography>
                    )}
                  </li>
                );
              }}
              renderInput={params => (
                <TextField {...params} variant="standard" label={key.charAt(0).toUpperCase() + key.slice(1)} />
              )}
            />
          </FormControl>
        ))}
        <FormControl style={{ marginTop: 10 }}>
          <Button variant="contained" color="primary" onClick={() => filtersSetter({})}>
            Clear filters
          </Button>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <Divider />
      </Grid>
      <Grid item xs={12}>
        <FormControl sx={{ marginLeft: theme.spacing(1), marginRight: theme.spacing(3), minWidth: 300 }}>
          <Autocomplete
            id="tag-providers"
            options={tagProviders}
            onChange={(_, provider) => handleTagProviderChange(provider)}
            renderInput={params => <TextField {...params} variant="standard" label="Tag provider" />}
            renderOption={(props, option) => (
              <li {...props} key={option}>
                <Typography variant="body2">{option}</Typography>
              </li>
            )}
          />
        </FormControl>
        <FormControl sx={{ marginLeft: theme.spacing(1), marginRight: theme.spacing(3), minWidth: 300 }}>
          <Autocomplete
            id="tag-keys"
            key={String(resetTagKeys)}
            // freeSolo
            disabled={!tagProvider}
            open={openTagKey}
            onOpen={() => setOpenTagKey(true)}
            onClose={() => setOpenTagKey(false)}
            options={tagKeys?.length ? tagKeys : [{ key: 'No value', provider: tagProvider as string }]}
            getOptionLabel={tag => tag.key}
            getOptionDisabled={tag => tag.key === 'No value'}
            loading={loadingTagKeys}
            onChange={(_, tagKey) => handleTagKeyChange(tagKey)}
            renderInput={params => (
              <TextField
                {...params}
                variant="standard"
                label="Tag keys"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {loadingTagKeys ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps?.endAdornment}
                    </React.Fragment>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.key}>
                <Typography variant="body2">{option.key}</Typography>
              </li>
            )}
          />
        </FormControl>
        <FormControl sx={{ marginLeft: theme.spacing(1), marginRight: theme.spacing(3), minWidth: 300 }}>
          <Autocomplete
            id="tag-values"
            key={String(resetTagValues)}
            // freeSolo
            disabled={!selectedTagKey}
            open={openTagValue}
            onOpen={() => setOpenTagValue(true)}
            onClose={() => setOpenTagValue(false)}
            options={
              tagValues?.length ? tagValues : [{ key: 'No value', value: 'No value', provider: tagProvider as string }]
            }
            getOptionLabel={tag => tag?.value || ''}
            getOptionDisabled={tag => tag?.value === 'No value' || tagExists(selectedTags, tag)}
            loading={loadingTagValues}
            onChange={(_, tag) => handleTagValueSelection(tag)}
            renderInput={params => (
              <TextField
                {...params}
                variant="standard"
                label="Tag values"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {loadingTagValues ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps?.endAdornment}
                    </React.Fragment>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.value}>
                <Typography variant="body2">{option.value}</Typography>
              </li>
            )}
          />
        </FormControl>
        <FormControl style={{ marginTop: 10 }}>
          <HtmlTooltip
            title={
              <React.Fragment>
                You can apply <b>tags</b> to <em>one or more</em> providers. <b>Tags</b> will only filter the costs for
                the <b>selected providers</b>, while <em>others remain unchanged</em>.
              </React.Fragment>
            }
          >
            <Button variant="contained" color="primary" onClick={() => selectedTagsSetter(selectedTags)}>
              Apply
            </Button>
          </HtmlTooltip>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        {selectedTags.map(tag => (
          <Chip
            size="small"
            key={`${tag.provider}/${tag.key}=${tag.value}`}
            label={`${tag.provider}/${tag.key}=${tag.value}`}
            onDelete={handleDeleteTag(tag)}
          />
        ))}
      </Grid>
    </Grid>
  );
};
