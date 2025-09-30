import { renderHook } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useInfraWalletSearchParams } from './useInfraWalletSearchParams';
import { Filters, Tag } from '../api/types';
import { MonthRange } from '../components/types';

// Mock useSearchParams
const mockSetSearchParams = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

describe('useInfraWalletSearchParams', () => {
  beforeEach(() => {
    mockSearchParams.toString = () => '';
    mockSetSearchParams.mockClear();
  });

  it('should initialize with default values when URL is empty', () => {
    const defaultFilters: Filters = { provider: ['aws'] };
    const defaultTags: Tag[] = [{ provider: 'aws', key: 'env', value: 'prod' }];
    const defaultMonthRange: MonthRange = {
      startMonth: startOfMonth(new Date('2024-01-01')),
      endMonth: endOfMonth(new Date('2024-03-31')),
    };

    const { result } = renderHook(
      () =>
        useInfraWalletSearchParams({
          defaultFilters,
          defaultTags,
          defaultMonthRange,
          defaultGranularity: 'monthly',
          defaultAggregatedBy: 'provider',
        }),
      {
        wrapper: BrowserRouter,
      },
    );

    const state = result.current.getInitialState();

    expect(state.filters).toEqual(defaultFilters);
    expect(state.selectedTags).toEqual(defaultTags);
    expect(state.granularity).toBe('monthly');
    expect(state.aggregatedBy).toBe('provider');
  });

  it('should parse filters from URL', () => {
    mockSearchParams.get = jest.fn((key: string) => {
      if (key === 'filters') return 'provider:aws,azure;service:ec2,s3';
      return null;
    });

    const { result } = renderHook(() => useInfraWalletSearchParams(), {
      wrapper: BrowserRouter,
    });

    const state = result.current.getInitialState();

    expect(state.filters).toEqual({
      provider: ['aws', 'azure'],
      service: ['ec2', 's3'],
    });
  });

  it('should parse tags from URL', () => {
    mockSearchParams.get = jest.fn((key: string) => {
      if (key === 'tags') return 'aws:Environment:Production;azure:CostCenter:Engineering';
      return null;
    });

    const { result } = renderHook(() => useInfraWalletSearchParams(), {
      wrapper: BrowserRouter,
    });

    const state = result.current.getInitialState();

    expect(state.selectedTags).toEqual([
      { provider: 'aws', key: 'Environment', value: 'Production' },
      { provider: 'azure', key: 'CostCenter', value: 'Engineering' },
    ]);
  });

  it('should parse date range from URL', () => {
    mockSearchParams.get = jest.fn((key: string) => {
      if (key === 'from') return '2024-01';
      if (key === 'to') return '2024-03';
      return null;
    });

    const { result } = renderHook(() => useInfraWalletSearchParams(), {
      wrapper: BrowserRouter,
    });

    const state = result.current.getInitialState();

    expect(state.monthRange.startMonth).toEqual(startOfMonth(new Date('2024-01-01')));
    expect(state.monthRange.endMonth).toEqual(startOfMonth(new Date('2024-03-01')));
  });

  it('should parse granularity and groupBy from URL', () => {
    mockSearchParams.get = jest.fn((key: string) => {
      if (key === 'granularity') return 'daily';
      if (key === 'groupBy') return 'category';
      return null;
    });

    const { result } = renderHook(() => useInfraWalletSearchParams(), {
      wrapper: BrowserRouter,
    });

    const state = result.current.getInitialState();

    expect(state.granularity).toBe('daily');
    expect(state.aggregatedBy).toBe('category');
  });

  it('should update URL when updateUrlState is called with filters', () => {
    const { result } = renderHook(() => useInfraWalletSearchParams(), {
      wrapper: BrowserRouter,
    });

    const filters: Filters = {
      provider: ['aws', 'gcp'],
      service: ['ec2'],
    };

    result.current.updateUrlState({ filters });

    expect(mockSetSearchParams).toHaveBeenCalled();
  });

  it('should handle empty filters correctly', () => {
    mockSearchParams.get = jest.fn((key: string) => {
      if (key === 'filters') return '';
      return null;
    });

    const { result } = renderHook(() => useInfraWalletSearchParams(), {
      wrapper: BrowserRouter,
    });

    const state = result.current.getInitialState();

    expect(state.filters).toEqual({});
  });
});
