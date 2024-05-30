import {
  addDays,
  endOfDay,
  startOfDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  startOfWeek,
  endOfWeek,
  isSameDay,
} from 'date-fns';

import { Preview } from 'react-date-range';

const defineds = {
  startOfWeek: startOfWeek(new Date()),
  endOfWeek: endOfWeek(new Date()),
  startOfLastWeek: startOfWeek(addDays(new Date(), -7)),
  endOfLastWeek: endOfWeek(addDays(new Date(), -7)),
  startOfToday: startOfDay(new Date()),
  endOfToday: endOfDay(new Date()),
  startOfYesterday: startOfDay(addDays(new Date(), -1)),
  endOfYesterday: endOfDay(addDays(new Date(), -1)),
  startOfMonth: startOfMonth(new Date()),
  endOfMonth: endOfMonth(new Date()),
  startOfLastMonth: startOfMonth(addMonths(new Date(), -1)),
  endOfLastMonth: endOfMonth(addMonths(new Date(), -1)),
  startOfLast2Months: startOfMonth(addMonths(new Date(), -2)),
  startOfLast3Months: startOfMonth(addMonths(new Date(), -3)),
  startOfLast5Months: startOfMonth(addMonths(new Date(), -5)),
  startOfLast11Months: startOfMonth(addMonths(new Date(), -11)),
};

const staticRangeHandler = {
  range: (): Preview => {
    return {};
  },
  isSelected(range: any) {
    const definedRange = this.range();
    return (
      isSameDay(range.startDate, definedRange.startDate as Date) &&
      isSameDay(range.endDate, definedRange.endDate as Date)
    );
  },
};

export function createStaticRanges(ranges: any) {
  return ranges.map((range: any) => ({ ...staticRangeHandler, ...range }));
}

export const defaultStaticRanges = createStaticRanges([
  {
    label: 'This Month',
    range: () => ({
      startDate: defineds.startOfMonth,
      endDate: defineds.endOfMonth,
    }),
  },
  {
    label: 'Last Month',
    range: () => ({
      startDate: defineds.startOfLastMonth,
      endDate: defineds.endOfLastMonth,
    }),
  },
  {
    label: 'Last 3 Months',
    range: () => ({
      startDate: defineds.startOfLast3Months,
      endDate: defineds.endOfLastMonth,
    }),
  },
  {
    label: 'Last 3 Months Inclu. Current',
    range: () => ({
      startDate: defineds.startOfLast2Months,
      endDate: defineds.endOfMonth,
    }),
  },
  {
    label: 'Last 6 Months Inclu. Current',
    range: () => ({
      startDate: defineds.startOfLast5Months,
      endDate: defineds.endOfMonth,
    }),
  },
  {
    label: 'Last 12 Months Inclu. Current',
    range: () => ({
      startDate: defineds.startOfLast11Months,
      endDate: defineds.endOfMonth,
    }),
  },
]);
