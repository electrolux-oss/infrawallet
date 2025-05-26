import { getBillingPeriodFormat, getBillingPeriod, parseCost } from './functions';
import { GRANULARITY } from './consts';

describe('getBillingPeriodFormat', () => {
  it('should return "YYYY-MM" for monthly granularity', () => {
    expect(getBillingPeriodFormat(GRANULARITY.MONTHLY)).toBe('YYYY-MM');
  });

  it('should return "YYYY-MM-DD" for daily granularity', () => {
    expect(getBillingPeriodFormat(GRANULARITY.DAILY)).toBe('YYYY-MM-DD');
  });

  it('should throw an error for invalid granularity', () => {
    // @ts-expect-error
    expect(() => getBillingPeriodFormat('weekly')).toThrow('Invalid granularity');
  });
});

describe('getBillingPeriod', () => {
  it('should return YYYY-MM for monthly granularity', () => {
    expect(getBillingPeriod(GRANULARITY.MONTHLY, '2025-04-08T01:13:52Z', 'YYYY-MM-DDTHH:mm:ssZ')).toBe('2025-04');
    expect(getBillingPeriod(GRANULARITY.MONTHLY, '2025-04-08T00:00:00', 'YYYY-MM-DDTHH:mm:ss')).toBe('2025-04');
    expect(getBillingPeriod(GRANULARITY.MONTHLY, '2025-04-08', 'YYYY-MM-DD')).toBe('2025-04');
    expect(getBillingPeriod(GRANULARITY.MONTHLY, '20250408', 'YYYYMMDD')).toBe('2025-04');
    expect(getBillingPeriod(GRANULARITY.MONTHLY, '04/08/2025', 'MM/DD/YYYY')).toBe('2025-04');
  });

  it('should return YYYY-MM-DD for daily granularity', () => {
    expect(getBillingPeriod(GRANULARITY.DAILY, '2025-04-08T01:13:52Z', 'YYYY-MM-DDTHH:mm:ssZ')).toBe('2025-04-08');
    expect(getBillingPeriod(GRANULARITY.DAILY, '2025-04-08T00:00:00', 'YYYY-MM-DDTHH:mm:ss')).toBe('2025-04-08');
    expect(getBillingPeriod(GRANULARITY.DAILY, '2025-04-08', 'YYYY-MM-DD')).toBe('2025-04-08');
    expect(getBillingPeriod(GRANULARITY.DAILY, '20250408', 'YYYYMMDD')).toBe('2025-04-08');
    expect(getBillingPeriod(GRANULARITY.DAILY, '04/08/2025', 'MM/DD/YYYY')).toBe('2025-04-08');
  });

  it('should throw an error for invalid granularity', () => {
    // @ts-expect-error
    expect(() => getBillingPeriod('weekly', '2025-05-23')).toThrow('Invalid granularity');
  });
});

describe('parseCost', () => {
  it('should return the number rounded to 2 decimal places for valid numbers', () => {
    expect(parseCost(1.234)).toBe(1.23);
    expect(parseCost(1.235)).toBe(1.24);
    expect(parseCost('2.456')).toBe(2.46);
    expect(parseCost(0)).toBe(0);
    expect(parseCost('0')).toBe(0);
  });

  it('should return 0 for invalid numbers', () => {
    expect(parseCost(undefined)).toBe(0);
    expect(parseCost(null)).toBe(0);
    expect(parseCost('')).toBe(0);
    expect(parseCost('abc')).toBe(0);
    expect(parseCost(NaN)).toBe(0);
  });
});
