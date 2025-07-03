import { InfoCard, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { default as React, useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { infraWalletApiRef } from '../../api/InfraWalletApi';
import { CostReportsResponse, Report, Tag } from '../../api/types';

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

async function getFilteredCostReports(infrawalletApi: any, filters: string, tags: Tag[]): Promise<Report[] | null> {
  const groups = '';
  const granularity = 'monthly';

  const endTime = new Date();
  const startTime = new Date();
  startTime.setMonth(endTime.getMonth() - 2);

  const costReportsResponse: CostReportsResponse = await infrawalletApi.getCostReports(
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
  return costReportsResponse.data ?? null;
}

function getTags(annotations: Record<string, string>): Tag[] {
  const tags: Tag[] = [];
  if (annotations['infrawallet.io/tags'] && annotations['infrawallet.io/provider']) {
    const tagsString = annotations['infrawallet.io/tags'];
    const provider = annotations['infrawallet.io/provider'];
    tagsString.split(',').forEach(pair => {
      const [key, value]: string[] = pair.split(':').map((s: string) => s.trim());
      if (key && value) {
        tags.push({
          key,
          value,
          provider,
        });
      }
    });
  }
  return tags;
}

function getFilters(annotations: Record<string, string>): string {
  if (!annotations || Object.keys(annotations).length === 0) {
    return '';
  }
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
  return `(${filtersArray.join(',')})`;
}

function getPeriodsFromReports(costData: Report[] | null): string[] {
  const periods = new Set<string>();
  (costData ?? []).forEach(report => {
    Object.keys(report.reports).forEach(period => periods.add(period));
  });

  return Array.from(periods).sort();
}

export function getUniqueProjects(costData: Report[] | null): string[] {
  return Array.from(
    new Set(
      (costData ?? [])
        .map(report => {
          const project = report.project;
          const account = report.account;
          if (typeof project === 'string') {
            return project;
          }
          if (typeof account === 'string') {
            return account;
          }
          return undefined;
        })
        .filter((project): project is string => !!project),
    ),
  );
}

function getTotalCostByPeriod(
  costData: Report[] | null,
  sortedPeriods: string[] | null,
): Array<{ period: string; total: number }> {
  return (sortedPeriods ?? []).map(period => {
    const total = (costData ?? []).reduce((sum, report) => {
      return sum + (report.reports[period] ?? 0);
    }, 0);
    return { period, total };
  });
}

function getTotalCostForPeriod(
  totalCostsByPeriod: Array<{ period: string; total: number }>,
  period: string | null,
): number {
  if (!period) {
    return 0;
  }
  return (totalCostsByPeriod ?? []).find(item => item.period === period)?.total ?? 0;
}

function getRelativeChangeInPercentage(
  currentCost: number,
  previousCost: number,
): { change: number; formattedChange: string } {
  const percentageChange = previousCost !== 0 ? ((currentCost - previousCost) / previousCost) * 100 : 0;
  const percentageChangeFormatted = Math.abs(percentageChange).toFixed(2);
  return { change: percentageChange, formattedChange: percentageChangeFormatted };
}

export function getChartData(
  costData: Report[] | null,
  projects: string[],
  sortedPeriods: string[],
): Array<Record<string, any>> {
  return sortedPeriods.map(period => {
    const dataPoint: Record<string, any> = { period };
    projects.forEach(project => {
      const projectReports = (costData ?? []).filter(report => {
        if (typeof report.project === 'string') {
          return report.project === project;
        }
        if (typeof report.account === 'string') {
          return report.account === project;
        }
        return false;
      });
      const total = projectReports.reduce((sum, report) => {
        return sum + (report.reports[period] ?? 0);
      }, 0);
      dataPoint[project] = total;
    });
    return dataPoint;
  });
}

function getPerServiceCosts(costData: Report[] | null, currentPeriod: string | null): Record<string, number> {
  if (!currentPeriod) {
    return {};
  }
  return (costData ?? []).reduce(
    (acc, report) => {
      const service = report.service;
      const cost = report.reports[currentPeriod] ?? 0;
      if (typeof service === 'string') {
        if (!acc[service]) {
          acc[service] = 0;
        }
        acc[service] += cost;
      }
      return acc;
    },
    {} as Record<string, number>,
  );
}

function getServiceTableData(
  perServiceCosts: Record<string, number>,
  prevPerServiceCosts: Record<string, number>,
): Array<{ service: string; cost: number; change: number }> {
  return Object.entries(perServiceCosts).map(([service, cost]) => {
    const prevCost = prevPerServiceCosts[service] ?? 0;
    const change = prevCost !== 0 ? ((cost - prevCost) / prevCost) * 100 : 0;
    return {
      service,
      cost,
      change,
    };
  });
}

function getChangeStyles(percentageChange: number) {
  let color = '#0052cc';
  let backgroundColor = '#e9f2ff';
  let mark = '';
  if (percentageChange < 0) {
    color = '#216e4e';
    backgroundColor = '#dcfff1';
    mark = '▼';
  } else if (percentageChange > 0) {
    color = '#ae2e24';
    backgroundColor = '#ffeceb';
    mark = '▲';
  }
  return { color, backgroundColor, mark };
}

const TotalCostTab = ({
  totalCost,
  previousTotalCost,
  percentageChange,
  chartData,
  projects,
}: {
  totalCost: number;
  percentageChange: { change: number; formattedChange: string };
  previousTotalCost: number;
  chartData: Array<Record<string, any>>;
  projects: string[];
}) => {
  const { color, backgroundColor, mark } = getChangeStyles(percentageChange.change);

  return (
    <Box p={2}>
      <Box display="flex" alignItems="center">
        {previousTotalCost > 0 && (
          <Box
            sx={{
              fontSize: '0.82em',
              paddingInline: '2px',
              borderRadius: '4px',
              color: color,
              backgroundColor: backgroundColor,
            }}
            mr={1}
          >
            {mark} {percentageChange.formattedChange}%
          </Box>
        )}
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
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
  );
};

const ServiceBreakDownTab = ({
  serviceRows,
}: {
  serviceRows: Array<{ service: string; cost: number; change: number }>;
}) => {
  return (
    <Box p={2}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Service</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
              Monthly Cost
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
              Monthly Change
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {serviceRows.map(row => {
            let serviceColor = '#0052cc';
            let serviceBackgroundColor = '#e9f2ff';
            let serviceMark = '';
            if (row.change < 0) {
              serviceColor = '#216e4e';
              serviceBackgroundColor = '#dcfff1';
              serviceMark = '▼';
            } else if (row.change > 0) {
              serviceColor = '#ae2e24';
              serviceBackgroundColor = '#ffeceb';
              serviceMark = '▲';
            }

            const changeFormatted = Math.abs(row.change).toFixed(2);
            return (
              <TableRow key={row.service}>
                <TableCell component="th" scope="row">
                  {row.service}
                </TableCell>
                <TableCell align="right">${row.cost.toFixed(2)}</TableCell>
                <TableCell align="right">
                  <Box
                    sx={{
                      fontSize: '0.82em',
                      paddingInline: '2px',
                      borderRadius: '4px',
                      color: serviceColor,
                      backgroundColor: serviceBackgroundColor,
                    }}
                    display="inline"
                  >
                    {serviceMark} {changeFormatted}%
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
};

export const EntityInfraWalletCard = () => {
  const { entity } = useEntity();
  const infrawalletApi = useApi(infraWalletApiRef);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorSeverity, setErrorSeverity] = useState<'error' | 'warning'>('error');
  const [costData, setCostData] = useState<Report[] | null>(null);
  const [tabIndex, setTabIndex] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const annotations = entity.metadata.annotations ?? {};

      const tags: Tag[] = getTags(annotations);
      const filters = getFilters(annotations);

      let costReports: Report[] | null = [];
      try {
        costReports = await getFilteredCostReports(infrawalletApi, filters, tags);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch cost reports');
        setErrorSeverity('error');
      } finally {
        setLoading(false);
      }
      setCostData(costReports);
    };
    fetchData();
  }, [entity, infrawalletApi]);

  if (!error && !loading && (!costData || costData.length === 0)) {
    setError('No cost data available for this entity.');
    setErrorSeverity('warning');
  }
  const sortedPeriods = getPeriodsFromReports(costData);

  const totalCostsByPeriod = getTotalCostByPeriod(costData, sortedPeriods);

  const currentPeriod = sortedPeriods[sortedPeriods.length - 1];
  const previousPeriod = sortedPeriods.length > 1 ? sortedPeriods[sortedPeriods.length - 2] : null;

  const totalCost = getTotalCostForPeriod(totalCostsByPeriod, currentPeriod);
  const previousTotalCost = getTotalCostForPeriod(totalCostsByPeriod, previousPeriod);

  const projects = getUniqueProjects(costData);

  if (!error && !loading && projects.length === 0) {
    setError('No project/account data available to display in the chart.');
    setErrorSeverity('warning');
  }

  const perServiceCosts = getPerServiceCosts(costData, currentPeriod);
  const prevPerServiceCosts = getPerServiceCosts(costData, previousPeriod);
  const serviceRows = getServiceTableData(perServiceCosts, prevPerServiceCosts);

  const handleTabChange = (_event: React.ChangeEvent<{}>, newValue: number) => {
    setTabIndex(newValue);
  };

  return (
    <InfoCard title="InfraWallet">
      {loading && <Progress />}
      {error && <Alert severity={errorSeverity}>{error}</Alert>}
      {!loading && !error && (
        <>
          {/* tabs for total cost and service breakdown */}
          <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Cost Tabs">
            <Tab label="Total Cost" />
            <Tab label="Service Breakdown" />
          </Tabs>
          {/* total cost tab */}
          {tabIndex === 0 && (
            <TotalCostTab
              totalCost={totalCost}
              previousTotalCost={previousTotalCost}
              percentageChange={getRelativeChangeInPercentage(totalCost, previousTotalCost)}
              chartData={getChartData(costData, projects, sortedPeriods)}
              projects={projects}
            />
          )}

          {/* per-service cost tab */}
          {tabIndex === 1 && <ServiceBreakDownTab serviceRows={serviceRows} />}
        </>
      )}
    </InfoCard>
  );
};
