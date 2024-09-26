import React, { useState, useEffect } from 'react';
import { Progress, InfoCard } from '@backstage/core-components';
import { Alert } from '@material-ui/lab';
import { useApi } from '@backstage/core-plugin-api';
import { infraWalletApiRef } from '../../api/InfraWalletApi';
import { useEntity } from '@backstage/plugin-catalog-react';
import { Report, Tag } from '../../api/types';
import { Typography, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab, Box } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const useStyles = makeStyles({
  increase: {
    color: '#ae2e24',
    backgroundColor: '#ffeceb',
    borderRadius: '4px',
    padding: '2px 4px',
    fontSize: '0.82em',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Open Sans", "Helvetica Neue", sans-serif',
  },
  decrease: {
    color: '#216e4e',
    backgroundColor: '#dcfff1',
    borderRadius: '4px',
    padding: '2px 4px',
    fontSize: '0.82em',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Open Sans", "Helvetica Neue", sans-serif',
  },
  noChange: {
    color: '#0052cc',
    backgroundColor: '#e9f2ff',
    borderRadius: '4px',
    padding: '2px 4px',
    fontSize: '0.82em',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Open Sans", "Helvetica Neue", sans-serif',
  },
  regular: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Open Sans", "Helvetica Neue", sans-serif',
  },
  bold: {
    fontWeight: 'bold',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Open Sans", "Helvetica Neue", sans-serif',
  },
});

const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#413ea0',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ff00ff',
  '#00ffff',
];

export const EntityInfraWalletCard = () => {
  const classes = useStyles();
  const { entity } = useEntity();
  const infrawalletApi = useApi(infraWalletApiRef);

  const [costData, setCostData] = useState<Report[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState<number>(0);

  useEffect(() => {
    const fetchCostData = async () => {
      setLoading(true);
      setError(null);
      try {
        const annotations = entity.metadata.annotations || {};

        const annotationKeys = [
          'infrawallet.io/project',
          'infrawallet.io/account',
          'infrawallet.io/service',
          'infrawallet.io/category',
          'infrawallet.io/provider',
        ];

        const filtersObj: Record<string, string[]> = {};

        annotationKeys.forEach(key => {
          if (annotations[key]) {
            const shortKey = key.replace('infrawallet.io/', '');
            const values = annotations[key]
              .split(',')
              .map((v: string) => v.trim())
              .filter((v: string) => v.length > 0);
            filtersObj[shortKey] = values;
          }
        });

        if (annotations['infrawallet.io/extra-filters']) {
          const extraFilters = annotations['infrawallet.io/extra-filters'];
          // assuming extra-filters are in the format "key1: value1, key2: value2"
          extraFilters.split(',').forEach(pair => {
            const [key, value] = pair.split(':').map(s => s.trim());
            if (key && value) {
              const values = value
                .split('|')
                .map((v: string) => v.trim())
                .filter((v: string) => v.length > 0);
              filtersObj[key] = values;
            }
          });
        }

        // build filters string for API call (include all filters)
        const filtersArray = Object.entries(filtersObj).map(([key, values]) => {
          if (values.length === 1) {
            return `${key}:${values[0]}`;
          }
          const valuesString = values.join('|');
          return `${key}:(${valuesString})`;
        });
        const filters = `(${filtersArray.join(',')})`;

        const tags: Tag[] = [];
        const groups = '';
        const granularity = 'monthly';

        const endTime = new Date();
        const startTime = new Date();
        startTime.setMonth(endTime.getMonth() - 2);

        const costReportsResponse = await infrawalletApi.getCostReports(
          filters,
          tags,
          groups,
          granularity,
          startTime,
          endTime,
        );

        if (costReportsResponse.status !== 200) {
          throw new Error('Failed to fetch cost reports');
        }

        setCostData(costReportsResponse.data || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCostData();
  }, [entity, infrawalletApi]);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!costData || costData.length === 0) {
    return <Alert severity="info">No cost data available for this entity.</Alert>;
  }

  // prepare periods
  const periods = new Set<string>();
  costData.forEach(report => {
    Object.keys(report.reports).forEach(period => periods.add(period));
  });

  const sortedPeriods = Array.from(periods).sort();

  // calculate total cost for each period
  const totalCostsByPeriod = sortedPeriods.map(period => {
    const total = costData.reduce((sum, report) => {
      return sum + (report.reports[period] || 0);
    }, 0);
    return { period, total };
  });

  // calculate total cost for current and previous months
  const currentPeriod = sortedPeriods[sortedPeriods.length - 1];
  const previousPeriod = sortedPeriods.length > 1 ? sortedPeriods[sortedPeriods.length - 2] : null;

  const totalCost = totalCostsByPeriod.find(item => item.period === currentPeriod)?.total || 0;
  const previousTotalCost = previousPeriod
    ? totalCostsByPeriod.find(item => item.period === previousPeriod)?.total || 0
    : 0;

  // calculate percentage change
  const percentageChange = previousTotalCost !== 0 ? ((totalCost - previousTotalCost) / previousTotalCost) * 100 : 0;
  const percentageChangeFormatted = Math.abs(percentageChange).toFixed(2);
  let mark = '';
  if (percentageChange < 0) {
    mark = '▼';
  } else if (percentageChange > 0) {
    mark = '▲';
  }

  // 1. extract unique project IDs
  const projects = Array.from(
    new Set(
      costData
        .map(report => {
          const project = report.project as string | undefined;
          return typeof project === 'string' ? project : undefined;
        })
        .filter((project): project is string => !!project),
    ),
  );

  if (projects.length === 0) {
    return <Alert severity="warning">No project data available to display in the chart.</Alert>;
  }

  // 2. build chart data with per-project costs
  const chartData = sortedPeriods.map(period => {
    const dataPoint: Record<string, any> = { period };
    projects.forEach(project => {
      const projectReports = costData.filter(report => report.project === project);
      const total = projectReports.reduce((sum, report) => {
        return sum + (report.reports[period] || 0);
      }, 0);
      dataPoint[project] = total;
    });
    return dataPoint;
  });

  // 3. calculate per-service costs for current period
  const perServiceCosts = costData.reduce((acc, report) => {
    const service = report.service as string | undefined;
    const cost = report.reports[currentPeriod] || 0;
    if (typeof service === 'string') {
      if (!acc[service]) {
        acc[service] = 0;
      }
      acc[service] += cost;
    }
    return acc;
  }, {} as Record<string, number>);

  // 4. calculate per-service costs for previous period
  const prevPerServiceCosts = previousPeriod
    ? costData.reduce((acc, report) => {
        const service = report.service as string | undefined;
        const cost = report.reports[previousPeriod] || 0;
        if (typeof service === 'string') {
          if (!acc[service]) {
            acc[service] = 0;
          }
          acc[service] += cost;
        }
        return acc;
      }, {} as Record<string, number>)
    : {};

  // 5. prepare data for per-service table
  const serviceRows = Object.entries(perServiceCosts).map(([service, cost]) => {
    const prevCost = prevPerServiceCosts[service] || 0;
    const change = prevCost !== 0 ? ((cost - prevCost) / prevCost) * 100 : 0;
    return {
      service,
      cost,
      change,
    };
  });

  // helper function to determine className based on change
  const getChangeClass = (change: number): string => {
    if (change > 0) {
      return classes.increase;
    }
    if (change === 0) {
      return classes.noChange;
    }
    return classes.decrease;
  };

  // helper function to determine mark based on change
  const getChangeMark = (change: number): string => {
    if (change < 0) {
      return '▼';
    }
    if (change > 0) {
      return '▲';
    }
    return '';
  };

  const handleTabChange = (_event: React.ChangeEvent<{}>, newValue: number) => {
    setTabIndex(newValue);
  };

  return (
    <InfoCard title="InfraWallet">
      <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Cost Tabs">
        <Tab label="Total Cost" />
        <Tab label="Service Breakdown" />
      </Tabs>

      {/* total cost tab */}
      {tabIndex === 0 && (
        <Box p={2}>
          <Box display="flex" alignItems="center">
            {previousTotalCost > 0 && (
              <Box className={getChangeClass(percentageChange)} mr={1}>
                {mark} {percentageChangeFormatted}%
              </Box>
            )}
            <Typography variant="h6" className={classes.bold}>
              Current Month: ${totalCost.toFixed(2)}
            </Typography>
          </Box>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              {projects.map((project, index) => (
                <Line
                  key={project}
                  type="monotone"
                  dataKey={project}
                  stroke={COLORS[index % COLORS.length]}
                  activeDot={{ r: 8 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* per-service cost tab */}
      {tabIndex === 1 && (
        <Box p={2}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell className={classes.bold}>Service</TableCell>
                <TableCell align="right" className={classes.bold}>
                  Monthly Cost
                </TableCell>
                <TableCell align="right" className={classes.bold}>
                  Monthly Change
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {serviceRows.map(row => {
                const serviceChangeClass = getChangeClass(row.change);
                const serviceMark = getChangeMark(row.change);
                const changeFormatted = Math.abs(row.change).toFixed(2);
                return (
                  <TableRow key={row.service}>
                    <TableCell component="th" scope="row">
                      {row.service}
                    </TableCell>
                    <TableCell align="right">${row.cost.toFixed(2)}</TableCell>
                    <TableCell align="right">
                      <Box className={serviceChangeClass} display="inline">
                        {serviceMark} {changeFormatted}%
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
    </InfoCard>
  );
};
