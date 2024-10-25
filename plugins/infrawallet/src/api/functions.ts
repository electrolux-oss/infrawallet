import { format, parse, subDays, subMonths } from 'date-fns';
import { reduce } from 'lodash';
import moment from 'moment';
import { Filters, Report, Tag } from './types';

export const mergeCostReports = (reports: Report[], threshold?: number): Report[] => {
  const totalCosts: { id: string; total: number }[] = [];
  reports.forEach(report => {
    let total = 0;
    Object.values(report.reports).forEach(v => {
      total += v as number;
    });
    totalCosts.push({ id: report.id, total: total });
  });
  totalCosts.sort((a, b) => b.total - a.total);
  const idsToBeKept = totalCosts.slice(0, threshold).map(v => v.id);

  const mergedReports = reduce(
    reports,
    (accumulator: { [key: string]: Report }, report) => {
      let keyName = 'Others';
      if (idsToBeKept.includes(report.id)) {
        keyName = report.id;
      }
      if (!accumulator[keyName]) {
        accumulator[keyName] = {
          id: keyName,
          reports: {},
        };
      }

      Object.keys(report.reports).forEach(key => {
        if (accumulator[keyName].reports[key]) {
          accumulator[keyName].reports[key] += report.reports[key];
        } else {
          accumulator[keyName].reports[key] = report.reports[key];
        }
      });
      return accumulator;
    },
    {},
  );

  return Object.values(mergedReports).sort((a, b) => a.id.localeCompare(b.id));
};

export const filterCostReports = (reports: Report[], filters: Filters): Report[] => {
  const filteredReports = reports.filter(report => {
    let match = true;
    Object.keys(filters).forEach(key => {
      if (filters[key].length > 0 && !filters[key].includes(report[key] as string)) {
        match = false;
      }
    });
    return match;
  });

  return filteredReports;
};

export const aggregateCostReports = (reports: Report[], aggregatedBy?: string): Report[] => {
  const aggregatedReports: { [key: string]: Report } = reduce(
    reports,
    (accumulator, report) => {
      let keyName: string = 'no value';
      if (aggregatedBy && aggregatedBy in report) {
        keyName = report[aggregatedBy] as string;
      } else if (aggregatedBy === 'none') {
        keyName = 'Total';
      }

      if (!accumulator[keyName]) {
        accumulator[keyName] = {
          id: keyName,
          provider: report.provider,
          reports: {},
        } as {
          id: string;
          reports: { [key: string]: number };
          [key: string]: any;
        };

        if (aggregatedBy !== undefined) {
          accumulator[keyName][aggregatedBy] = keyName;
        }
      }

      Object.keys(report.reports).forEach(key => {
        if (accumulator[keyName].reports[key]) {
          accumulator[keyName].reports[key] += report.reports[key];
        } else {
          accumulator[keyName].reports[key] = report.reports[key];
        }
      });
      return accumulator;
    },
    {} as { [key: string]: Report },
  );
  return Object.values(aggregatedReports);
};

export const getReportKeyAndValues = (reports: Report[] | undefined): { [key: string]: string[] } => {
  const excludedKeys = ['id', 'reports'];
  const keyValueSets: { [key: string]: Set<string> } = {};
  reports?.forEach(report => {
    Object.keys(report).forEach(key => {
      if (!excludedKeys.includes(key)) {
        if (keyValueSets[key] === undefined) {
          keyValueSets[key] = new Set<string>();
        }

        keyValueSets[key].add(report[key] as string);
      }
    });
  });

  const keyValues: { [key: string]: string[] } = {};
  Object.keys(keyValueSets).forEach((key: string) => {
    keyValues[key] = Array.from(keyValueSets[key]);
    keyValues[key].sort((a, b) => a.localeCompare(b));
  });
  return keyValues;
};

export const extractProvider = (input: string): string | undefined => {
  let provider = undefined;
  if (input && input.indexOf('/') !== -1) {
    provider = input.split('/')[0];
  }

  return provider;
};

export const extractAccountInfo = (input: string): { accountName: string; accountId?: string } => {
  // try to match format: accountName (accountId), e.g. aws-dev (123456789012)
  const regex = /^(.*?)\s*\(([^)]+)\)$/;
  const match = input.match(regex);

  if (match) {
    const accountName = match[1];
    const accountId = match[2];
    return { accountName: accountName, accountId: accountId };
  }

  return { accountName: input };
};

// check if targetTag exists in tags
export function tagExists(tags: Tag[], targetTag: Tag): boolean {
  return tags.some(
    tag => tag.provider === targetTag.provider && tag.key === targetTag.key && tag.value === targetTag.value,
  );
}

// convert Tag array to (provider1:key1=value1 OR provider2:key2=value2) format
export const tagsToString = (tags: Tag[]): string => {
  if (tags.length === 0) {
    return '()';
  }

  const keyValuePairs = tags.map(tag => `${tag.provider}:${tag.key}=${tag.value}`);
  return `(${keyValuePairs.join(' OR ')})`;
};

export const getAllReportTags = (reports: Report[]): string[] => {
  const tags = new Set<string>();
  const reservedKeys = ['id', 'account', 'service', 'category', 'provider', 'reports'];
  reports.forEach(report => {
    Object.keys(report).forEach(key => {
      if (reservedKeys.indexOf(key) === -1) {
        tags.add(key);
      }
    });
  });
  return Array.from(tags);
};

export const getPreviousMonth = (month: string): string => {
  const date = parse(month, 'yyyy-MM', new Date());
  const previousMonth = subMonths(date, 1);
  return format(previousMonth, 'yyyy-MM');
};

export const getPreviousDay = (day: string): string => {
  const date = parse(day, 'yyyy-MM-dd', new Date());
  const previousDay = subDays(date, 1);
  return format(previousDay, 'yyyy-MM-dd');
};

export const getPeriodStrings = (granularity: string, startTime: Date, endTime: Date): string[] => {
  const result: string[] = [];
  const current = moment(startTime);

  while (current.isSameOrBefore(endTime) && current.isSameOrBefore(moment())) {
    if (granularity === 'monthly') {
      result.push(current.format('YYYY-MM'));
      current.add(1, 'months');
    } else {
      result.push(current.format('YYYY-MM-DD'));
      current.add(1, 'days');
    }
  }

  return result;
};

export const formatCurrency = (number: number, currency?: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    notation: 'compact',
  }).format(number);
};
