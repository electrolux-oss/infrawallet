import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parse, startOfMonth } from 'date-fns';
import { Filters, Tag } from '../api/types';
import { MonthRange } from '../components/types';

/**
 * Serialize filters object to URL query string format
 * Example: { provider: ['aws', 'azure'], service: ['ec2'] } => "provider:aws,azure;service:ec2"
 */
const serializeFilters = (filters: Filters): string => {
  const parts: string[] = [];
  for (const key of Object.keys(filters)) {
    if (filters[key] && filters[key].length > 0) {
      parts.push(`${key}:${filters[key].join(',')}`);
    }
  }
  return parts.join(';');
};

/**
 * Deserialize filters from URL query string
 * Example: "provider:aws,azure;service:ec2" => { provider: ['aws', 'azure'], service: ['ec2'] }
 */
const deserializeFilters = (filtersString: string): Filters => {
  const filters: Filters = {};
  if (!filtersString) return filters;

  const parts = filtersString.split(';');
  for (const part of parts) {
    const [key, values] = part.split(':');
    if (key && values) {
      filters[key] = values.split(',');
    }
  }
  return filters;
};

/**
 * Serialize tags array to URL query string format
 * Example: [{ provider: 'aws', key: 'env', value: 'prod' }] => "aws:env:prod"
 */
const serializeTags = (tags: Tag[]): string => {
  return tags.map(tag => `${tag.provider}:${tag.key}:${tag.value || ''}`).join(';');
};

/**
 * Deserialize tags from URL query string
 * Example: "aws:env:prod;azure:cost-center:eng" => [{ provider: 'aws', key: 'env', value: 'prod' }, ...]
 */
const deserializeTags = (tagsString: string): Tag[] => {
  if (!tagsString) return [];

  return tagsString.split(';').map(tagStr => {
    const [provider, key, value] = tagStr.split(':');
    return { provider, key, value: value || undefined };
  });
};

/**
 * Format date to YYYY-MM for URL
 */
const formatDateForUrl = (date: Date): string => {
  return format(date, 'yyyy-MM');
};

/**
 * Parse YYYY-MM from URL to Date
 */
const parseDateFromUrl = (dateStr: string): Date | null => {
  try {
    return startOfMonth(parse(dateStr, 'yyyy-MM', new Date()));
  } catch {
    return null;
  }
};

export interface InfraWalletUrlState {
  filters: Filters;
  selectedTags: Tag[];
  monthRange: MonthRange;
  granularity: string;
  aggregatedBy: string;
}

interface UseInfraWalletSearchParamsOptions {
  defaultFilters?: Filters;
  defaultTags?: Tag[];
  defaultMonthRange?: MonthRange;
  defaultGranularity?: string;
  defaultAggregatedBy?: string;
}

/**
 * Custom hook to manage InfraWallet state in URL search params
 * This enables deep linking and bookmarking of specific filter/view combinations
 */
export const useInfraWalletSearchParams = (options: UseInfraWalletSearchParamsOptions = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isInitialMount = useRef(true);

  /**
   * Get initial state from URL or use defaults
   */
  const getInitialState = useCallback((): InfraWalletUrlState => {
    // Filters
    const filtersParam = searchParams.get('filters');
    const filters = filtersParam ? deserializeFilters(filtersParam) : options.defaultFilters || {};

    // Tags
    const tagsParam = searchParams.get('tags');
    const selectedTags = tagsParam ? deserializeTags(tagsParam) : options.defaultTags || [];

    // Month Range
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    let monthRange = options.defaultMonthRange;
    if (fromParam && toParam) {
      const startMonth = parseDateFromUrl(fromParam);
      const endMonth = parseDateFromUrl(toParam);
      if (startMonth && endMonth) {
        monthRange = { startMonth, endMonth };
      }
    }

    // Granularity
    const granularityParam = searchParams.get('granularity');
    const granularity = granularityParam || options.defaultGranularity || 'monthly';

    // Aggregated By (Group By)
    const groupByParam = searchParams.get('groupBy');
    const aggregatedBy = groupByParam || options.defaultAggregatedBy || 'none';

    return {
      filters,
      selectedTags,
      monthRange: monthRange!,
      granularity,
      aggregatedBy,
    };
  }, [searchParams, options]);

  /**
   * Update URL search params with current state
   */
  const updateUrlState = useCallback(
    (state: Partial<InfraWalletUrlState>) => {
      setSearchParams(
        prev => {
          const newParams = new URLSearchParams(prev);

          // Update filters
          if (state.filters !== undefined) {
            const filtersStr = serializeFilters(state.filters);
            if (filtersStr) {
              newParams.set('filters', filtersStr);
            } else {
              newParams.delete('filters');
            }
          }

          // Update tags
          if (state.selectedTags !== undefined) {
            const tagsStr = serializeTags(state.selectedTags);
            if (tagsStr) {
              newParams.set('tags', tagsStr);
            } else {
              newParams.delete('tags');
            }
          }

          // Update month range
          if (state.monthRange !== undefined) {
            newParams.set('from', formatDateForUrl(state.monthRange.startMonth));
            newParams.set('to', formatDateForUrl(state.monthRange.endMonth));
          }

          // Update granularity
          if (state.granularity !== undefined) {
            newParams.set('granularity', state.granularity);
          }

          // Update aggregatedBy (groupBy)
          if (state.aggregatedBy !== undefined) {
            newParams.set('groupBy', state.aggregatedBy);
          }

          return newParams;
        },
        { replace: true },
      ); // Use replace to avoid creating excessive history entries
    },
    [setSearchParams],
  );

  // Mark that we've passed the initial mount
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  return {
    getInitialState,
    updateUrlState,
    isInitialMount: isInitialMount.current,
  };
};
