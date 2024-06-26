import { format, parse, subMonths } from 'date-fns';
import { reduce } from 'lodash';
import moment from 'moment';
import { Report } from './types';

export const mergeCostReports = (reports: Report[], threshold: number): Report[] => {
  const totalCosts: { id: string; total: number }[] = [];
  reports.forEach(report => {
    let total = 0;
    Object.values(report.reports).forEach(v => {
      total += v as number;
    });
    totalCosts.push({ id: report.id, total: total });
  });
  const sortedTotalCosts = totalCosts.sort((a, b) => b.total - a.total);
  const idsToBeKept = sortedTotalCosts.slice(0, threshold).map(v => v.id);

  const mergedReports = reduce(
    reports,
    (accumulator: { [key: string]: Report }, report) => {
      let keyName = 'others';
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

  return Object.values(mergedReports);
};

export const aggregateCostReports = (reports: Report[], aggregatedBy?: string): Report[] => {
  const aggregatedReports: { [key: string]: Report } = reduce(
    reports,
    (accumulator, report) => {
      let keyName: string = 'no value';
      if (aggregatedBy && aggregatedBy in report) {
        keyName = report[aggregatedBy] as string;
      } else if (aggregatedBy === 'none') {
        keyName = 'Total cloud costs';
      }

      if (!accumulator[keyName]) {
        accumulator[keyName] = {
          id: keyName,
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

export const getAllReportTags = (reports: Report[]): string[] => {
  const tags = new Set<string>();
  const reservedKeys = ['id', 'name', 'service', 'category', 'provider', 'reports'];
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
