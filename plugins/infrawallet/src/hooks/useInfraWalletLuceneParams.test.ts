import { renderHook, act } from '@testing-library/react';
import { useInfraWalletLuceneParams } from './useInfraWalletLuceneParams';
import { Filters, Tag } from '../api/types';
import { startOfMonth, subMonths } from 'date-fns';

// Mock react-router-dom
const mockSetSearchParams = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

/**
 * Helper function to reduce duplication in updateUrlState tests
 * Calls updateUrlState with the given state and returns the resulting URLSearchParams
 */
const getUpdatedSearchParams = (
  result: any,
  state: any,
  baseParams: URLSearchParams = new URLSearchParams(),
  callIndex: number = 0,
): URLSearchParams => {
  act(() => {
    result.current.updateUrlState(state);
  });

  const updateFn = mockSetSearchParams.mock.calls[callIndex][0];
  return updateFn(baseParams);
};

/**
 * Helper function to render hook with options and return initial state
 * Reduces duplication in tests that just need to get initial state
 */
const getInitialState = (options?: any) => {
  const { result } = renderHook(() => useInfraWalletLuceneParams(options));
  return result.current.getInitialState();
};

/**
 * Helper function to render hook and return the result
 * For tests that need access to the full hook result
 */
const renderHookAndGetResult = (options?: any) => {
  return renderHook(() => useInfraWalletLuceneParams(options));
};

describe('useInfraWalletLuceneParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear search params
    for (const key of Array.from(mockSearchParams.keys())) {
      mockSearchParams.delete(key);
    }
  });

  describe('getInitialState', () => {
    it('should return default values when URL params are empty', () => {
      const defaultMonthRange = {
        startMonth: startOfMonth(subMonths(new Date(), 6)),
        endMonth: startOfMonth(new Date()),
      };
      const defaultFilters: Filters = { provider: ['aws'] };
      const defaultTags: Tag[] = [{ provider: 'aws', key: 'env', value: 'prod' }];

      const { result } = renderHook(() =>
        useInfraWalletLuceneParams({
          defaultFilters,
          defaultTags,
          defaultMonthRange,
          defaultGranularity: 'daily',
          defaultAggregatedBy: 'service',
        }),
      );

      const state = result.current.getInitialState();

      expect(state.filters).toEqual(defaultFilters);
      expect(state.selectedTags).toEqual(defaultTags);
      expect(state.monthRange).toEqual(defaultMonthRange);
      expect(state.granularity).toBe('daily');
      expect(state.aggregatedBy).toBe('service');
    });

    it('should parse Lucene query from URL with single filter', () => {
      mockSearchParams.set('q', encodeURIComponent('provider:aws'));

      const state = getInitialState();

      expect(state.filters).toEqual({ provider: ['aws'] });
      expect(state.selectedTags).toEqual([]);
    });

    it('should parse Lucene query with multiple filters using AND', () => {
      mockSearchParams.set('q', encodeURIComponent('provider:aws AND service:ec2'));

      const state = getInitialState();

      expect(state.filters).toEqual({
        provider: ['aws'],
        service: ['ec2'],
      });
    });

    it('should parse Lucene query with OR operators into array', () => {
      mockSearchParams.set('q', encodeURIComponent('provider:aws OR provider:azure'));

      const state = getInitialState();

      expect(state.filters).toEqual({
        provider: ['aws', 'azure'],
      });
    });

    it('should parse tags in provider.key=value format', () => {
      mockSearchParams.set('q', encodeURIComponent('tag:aws.Environment=Production'));

      const state = getInitialState();

      expect(state.selectedTags).toEqual([{ provider: 'aws', key: 'Environment', value: 'Production' }]);
    });

    it('should parse tags in provider:key:value format (fallback) with quotes', () => {
      // Lucene requires quotes for values containing colons
      mockSearchParams.set('q', encodeURIComponent('tag:"azure:Team:DevOps"'));

      const state = getInitialState();

      expect(state.selectedTags).toEqual([{ provider: 'azure', key: 'Team', value: 'DevOps' }]);
    });

    it('should parse complex query with filters and tags', () => {
      mockSearchParams.set('q', encodeURIComponent('provider:aws AND service:ec2 AND tag:aws.env=prod'));

      const state = getInitialState();

      expect(state.filters).toEqual({
        provider: ['aws'],
        service: ['ec2'],
      });
      expect(state.selectedTags).toEqual([{ provider: 'aws', key: 'env', value: 'prod' }]);
    });

    it('should parse month range from URL parameters', () => {
      mockSearchParams.set('from', '2024-01');
      mockSearchParams.set('to', '2024-06');

      const state = getInitialState();

      expect(state.monthRange.startMonth).toEqual(new Date(2024, 0, 1));
      expect(state.monthRange.endMonth).toEqual(new Date(2024, 5, 1));
    });

    it('should parse granularity from URL parameter', () => {
      mockSearchParams.set('granularity', 'daily');

      const state = getInitialState();

      expect(state.granularity).toBe('daily');
    });

    it('should parse aggregatedBy from groupBy URL parameter', () => {
      mockSearchParams.set('groupBy', 'service');

      const state = getInitialState();

      expect(state.aggregatedBy).toBe('service');
    });

    it('should handle invalid Lucene query gracefully', () => {
      mockSearchParams.set('q', 'invalid:::query::');

      const state = getInitialState();

      expect(state.filters).toEqual({});
      expect(state.selectedTags).toEqual([]);
    });

    it('should use defaults when date params are missing', () => {
      // No from/to params set at all
      const defaultMonthRange = {
        startMonth: startOfMonth(new Date(2024, 0, 1)),
        endMonth: startOfMonth(new Date(2024, 5, 1)),
      };

      const state = getInitialState({ defaultMonthRange });

      expect(state.monthRange).toEqual(defaultMonthRange);
    });

    it('should parse valid dates from URL', () => {
      mockSearchParams.set('from', '2023-03');
      mockSearchParams.set('to', '2023-09');

      const defaultMonthRange = {
        startMonth: startOfMonth(new Date(2024, 0, 1)),
        endMonth: startOfMonth(new Date(2024, 5, 1)),
      };

      const state = getInitialState({ defaultMonthRange });

      // Should use URL params instead of defaults
      expect(state.monthRange.startMonth).toEqual(new Date(2023, 2, 1));
      expect(state.monthRange.endMonth).toEqual(new Date(2023, 8, 1));
    });

    it('should use defaults when granularity is not in URL', () => {
      const state = getInitialState({ defaultGranularity: 'weekly' });

      expect(state.granularity).toBe('weekly');
    });

    it('should default granularity to monthly when no default provided', () => {
      const state = getInitialState();

      expect(state.granularity).toBe('monthly');
    });

    it('should default aggregatedBy to none when no default provided', () => {
      const state = getInitialState();

      expect(state.aggregatedBy).toBe('none');
    });
  });

  describe('updateUrlState', () => {
    it('should update filters in URL as Lucene query', () => {
      const { result } = renderHookAndGetResult();

      const newParams = getUpdatedSearchParams(result, {
        filters: { provider: ['aws'] },
      });

      expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function), { replace: true });
      expect(decodeURIComponent(newParams.get('q') || '')).toBe('provider:aws');
    });

    it('should update multiple filters with OR syntax', () => {
      const { result } = renderHookAndGetResult();

      const newParams = getUpdatedSearchParams(result, {
        filters: { provider: ['aws', 'azure'] },
      });

      expect(decodeURIComponent(newParams.get('q') || '')).toBe('(provider:aws OR provider:azure)');
    });

    it('should update tags in URL as Lucene query', () => {
      const { result } = renderHookAndGetResult();

      const newParams = getUpdatedSearchParams(result, {
        selectedTags: [{ provider: 'aws', key: 'env', value: 'prod' }],
      });

      expect(decodeURIComponent(newParams.get('q') || '')).toBe('tag:aws.env=prod');
    });

    it('should update both filters and tags in Lucene query', () => {
      const { result } = renderHookAndGetResult();

      const newParams = getUpdatedSearchParams(result, {
        filters: { provider: ['aws'], service: ['ec2'] },
        selectedTags: [{ provider: 'aws', key: 'env', value: 'prod' }],
      });

      expect(decodeURIComponent(newParams.get('q') || '')).toBe('provider:aws AND service:ec2 AND tag:aws.env=prod');
    });

    it('should update month range in URL', () => {
      const { result } = renderHookAndGetResult();

      const newParams = getUpdatedSearchParams(result, {
        monthRange: {
          startMonth: new Date(2024, 0, 1),
          endMonth: new Date(2024, 5, 1),
        },
      });

      expect(newParams.get('from')).toBe('2024-01');
      expect(newParams.get('to')).toBe('2024-06');
    });

    it('should update granularity in URL', () => {
      const { result } = renderHookAndGetResult();

      const newParams = getUpdatedSearchParams(result, {
        granularity: 'daily',
      });

      expect(newParams.get('granularity')).toBe('daily');
    });

    it('should update aggregatedBy as groupBy in URL', () => {
      const { result } = renderHookAndGetResult();

      const newParams = getUpdatedSearchParams(result, {
        aggregatedBy: 'service',
      });

      expect(newParams.get('groupBy')).toBe('service');
    });

    it('should merge filters with existing URL state when updating only filters', () => {
      mockSearchParams.set('q', encodeURIComponent('provider:aws'));
      mockSearchParams.set('from', '2024-01');
      mockSearchParams.set('to', '2024-06');

      const { result } = renderHookAndGetResult();

      const newParams = getUpdatedSearchParams(
        result,
        {
          filters: { provider: ['aws'], service: ['ec2'] },
        },
        mockSearchParams,
      );

      expect(newParams.get('from')).toBe('2024-01');
      expect(newParams.get('to')).toBe('2024-06');
      expect(decodeURIComponent(newParams.get('q') || '')).toBe('provider:aws AND service:ec2');
    });

    it('should merge tags with existing filters in URL', () => {
      mockSearchParams.set('q', encodeURIComponent('provider:aws'));

      const { result } = renderHookAndGetResult();

      const newParams = getUpdatedSearchParams(
        result,
        {
          selectedTags: [{ provider: 'aws', key: 'env', value: 'prod' }],
        },
        mockSearchParams,
      );

      expect(decodeURIComponent(newParams.get('q') || '')).toBe('provider:aws AND tag:aws.env=prod');
    });

    it('should delete query param when filters and tags are empty', () => {
      mockSearchParams.set('q', encodeURIComponent('provider:aws'));

      const { result } = renderHookAndGetResult();

      const newParams = getUpdatedSearchParams(
        result,
        {
          filters: {},
          selectedTags: [],
        },
        mockSearchParams,
      );

      expect(newParams.has('q')).toBe(false);
    });

    it('should use replace mode to avoid excessive history entries', () => {
      const { result } = renderHookAndGetResult();

      getUpdatedSearchParams(result, {
        filters: { provider: ['aws'] },
      });

      expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function), { replace: true });
    });

    it('should handle multiple simultaneous updates', () => {
      const { result } = renderHookAndGetResult();

      const newParams = getUpdatedSearchParams(result, {
        filters: { provider: ['aws'] },
        selectedTags: [{ provider: 'aws', key: 'env', value: 'prod' }],
        monthRange: {
          startMonth: new Date(2024, 0, 1),
          endMonth: new Date(2024, 5, 1),
        },
        granularity: 'daily',
        aggregatedBy: 'service',
      });

      expect(decodeURIComponent(newParams.get('q') || '')).toBe('provider:aws AND tag:aws.env=prod');
      expect(newParams.get('from')).toBe('2024-01');
      expect(newParams.get('to')).toBe('2024-06');
      expect(newParams.get('granularity')).toBe('daily');
      expect(newParams.get('groupBy')).toBe('service');
    });
  });

  describe('isInitialMount', () => {
    it('should be true on initial mount', () => {
      const { result } = renderHookAndGetResult();

      expect(result.current.isInitialMount).toBe(true);
    });

    it('should be false after first render', () => {
      const { result, rerender } = renderHookAndGetResult();

      expect(result.current.isInitialMount).toBe(true);

      rerender();

      expect(result.current.isInitialMount).toBe(false);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty query string', () => {
      mockSearchParams.set('q', '');

      const state = getInitialState();

      expect(state.filters).toEqual({});
      expect(state.selectedTags).toEqual([]);
    });

    it('should handle whitespace-only query string', () => {
      mockSearchParams.set('q', '   ');

      const state = getInitialState();

      expect(state.filters).toEqual({});
      expect(state.selectedTags).toEqual([]);
    });

    it('should handle malformed tag format gracefully', () => {
      mockSearchParams.set('q', encodeURIComponent('tag:invalidformat'));

      const state = getInitialState();

      expect(state.selectedTags).toEqual([]);
    });

    it('should handle tag with value containing colons using quotes', () => {
      // Lucene requires quotes for values with special characters like colons
      mockSearchParams.set('q', encodeURIComponent('tag:"aws:key:value:with:colons"'));

      const state = getInitialState();

      expect(state.selectedTags).toEqual([{ provider: 'aws', key: 'key', value: 'value:with:colons' }]);
    });

    it('should handle multiple tags', () => {
      mockSearchParams.set('q', encodeURIComponent('tag:aws.env=prod AND tag:azure.team=devops'));

      const state = getInitialState();

      expect(state.selectedTags).toEqual([
        { provider: 'aws', key: 'env', value: 'prod' },
        { provider: 'azure', key: 'team', value: 'devops' },
      ]);
    });

    it('should handle complex nested query with parentheses', () => {
      mockSearchParams.set('q', encodeURIComponent('(provider:aws OR provider:azure) AND service:ec2'));

      const state = getInitialState();

      expect(state.filters).toEqual({
        provider: ['aws', 'azure'],
        service: ['ec2'],
      });
    });

    it('should URL encode special characters in query', () => {
      const { result } = renderHookAndGetResult();

      const newParams = getUpdatedSearchParams(result, {
        selectedTags: [{ provider: 'aws', key: 'Environment', value: 'Prod & Test' }],
      });

      // The value should be URL encoded
      expect(newParams.get('q')).toContain('%');
    });

    it('should quote account values with special characters (slashes and parentheses)', () => {
      const { result } = renderHookAndGetResult();

      const newParams = getUpdatedSearchParams(result, {
        filters: {
          account: ['AWS/aws-dev-mock (012345678902)', 'AWS/aws-prod-mock (012345678903)'],
        },
      });

      // The account values should be quoted due to special characters
      expect(decodeURIComponent(newParams.get('q') || '')).toBe(
        '(account:"AWS/aws-dev-mock (012345678902)" OR account:"AWS/aws-prod-mock (012345678903)")',
      );
    });

    it('should parse quoted account values from URL', () => {
      mockSearchParams.set(
        'q',
        encodeURIComponent('(account:"AWS/aws-dev-mock (012345678902)" OR account:"AWS/aws-prod-mock (012345678903)")'),
      );

      const state = getInitialState();

      expect(state.filters).toEqual({
        account: ['AWS/aws-dev-mock (012345678902)', 'AWS/aws-prod-mock (012345678903)'],
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete workflow: read from URL, update, and verify new state', () => {
      // Start with some initial URL params
      mockSearchParams.set('q', encodeURIComponent('provider:aws'));
      mockSearchParams.set('from', '2024-01');
      mockSearchParams.set('to', '2024-06');
      mockSearchParams.set('granularity', 'monthly');
      mockSearchParams.set('groupBy', 'none');

      const { result } = renderHookAndGetResult();

      // Verify initial state is read correctly
      const initialState = result.current.getInitialState();
      expect(initialState.filters).toEqual({ provider: ['aws'] });
      expect(initialState.granularity).toBe('monthly');

      // Update with new filters
      const newParams = getUpdatedSearchParams(
        result,
        {
          filters: { provider: ['aws', 'azure'], service: ['ec2'] },
        },
        mockSearchParams,
      );

      // Verify the update includes both old and new params
      expect(decodeURIComponent(newParams.get('q') || '')).toBe('(provider:aws OR provider:azure) AND service:ec2');
      expect(newParams.get('from')).toBe('2024-01');
      expect(newParams.get('granularity')).toBe('monthly');
    });

    it('should handle switching from filters to tags', () => {
      mockSearchParams.set('q', encodeURIComponent('provider:aws'));

      const { result } = renderHookAndGetResult();

      // First update: add a service filter
      let newParams = getUpdatedSearchParams(
        result,
        {
          filters: { provider: ['aws'], service: ['ec2'] },
        },
        mockSearchParams,
        0,
      );
      expect(decodeURIComponent(newParams.get('q') || '')).toBe('provider:aws AND service:ec2');

      // Second update: add tags while keeping filters
      newParams = getUpdatedSearchParams(
        result,
        {
          selectedTags: [{ provider: 'aws', key: 'env', value: 'prod' }],
        },
        mockSearchParams,
        1,
      );
      expect(decodeURIComponent(newParams.get('q') || '')).toContain('tag:aws.env=prod');
    });
  });
});
