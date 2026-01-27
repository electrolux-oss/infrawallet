import { format, parse, startOfMonth, endOfMonth } from 'date-fns';
import * as lucene from 'lucene';
import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filters, Tag } from '../api/types';
import { MonthRange } from '../components/types';

/**
 * Parse tag value into Tag object
 * Supports two formats:
 * 1. provider.key=value (preferred)
 * 2. provider:key:value (fallback)
 */
const parseTag = (tagValue: string): Tag | null => {
  // Try provider.key=value format first
  if (tagValue.includes('.') && tagValue.includes('=')) {
    const [providerKey, value] = tagValue.split('=');
    const [provider, key] = providerKey.split('.');
    if (provider && key && value) {
      return { provider, key, value };
    }
  }

  // Fallback to provider:key:value format
  if (tagValue.includes(':')) {
    const tagParts = tagValue.split(':');
    if (tagParts.length >= 3) {
      const provider = tagParts[0];
      const key = tagParts[1];
      const value = tagParts.slice(2).join(':'); // In case value contains colons
      return { provider, key, value };
    }
  }

  return null;
};

/**
 * Add a filter value to the filters object, avoiding duplicates
 */
const addFilterValue = (filters: Filters, field: string, value: string): void => {
  if (!filters[field]) {
    filters[field] = [];
  }
  if (!filters[field].includes(value)) {
    filters[field].push(value);
  }
};

/**
 * Convert Lucene AST to Filters and Tags
 */
const astToFiltersAndTags = (ast: any): { filters: Filters; tags: Tag[] } => {
  const filters: Filters = {};
  const tags: Tag[] = [];

  const traverseAST = (node: any): void => {
    if (!node) return;

    // Process field:value pairs
    if (node.field && node.term) {
      if (node.field === 'tag') {
        const tag = parseTag(node.term);
        if (tag) {
          tags.push(tag);
        }
      } else {
        addFilterValue(filters, node.field, node.term);
      }
    }

    // Recursively process left and right nodes
    if (node.left) traverseAST(node.left);
    if (node.right) traverseAST(node.right);
  };

  traverseAST(ast);
  return { filters, tags };
};

/**
 * Escape and quote a value for Lucene query if it contains special characters
 */
const quoteLuceneValue = (value: string): string => {
  // Check if value contains special Lucene characters that require quoting
  const specialChars = /[/()[\]{}\s:]/;
  if (specialChars.test(value)) {
    // Escape any quotes in the value and wrap in quotes
    const escapedQuote = String.raw`\"`;
    return `"${value.replaceAll('"', escapedQuote)}"`;
  }
  return value;
};

/**
 * Quote a tag for Lucene query if a key contains special characters
 */
const quoteTag = (provider: string, key: string, value: string): string => {
  const specialChars = /[/()[\]{}\s:]/;
  const tag = `${provider}.${key}=${value}`;

  // If tag has special character in the key, it needs to be quoted. E.g. tag:"AWS.key:environment=staging"
  if (specialChars.test(key)) {
    return `tag:"${tag}"`;
  }
  return `tag:${tag}`;
};

/**
 * Convert Filters and Tags to Lucene query string
 */
const filtersAndTagsToLucene = (filters: Filters, tags: Tag[]): string => {
  const queryParts: string[] = [];

  // Convert filters to query parts
  for (const field of Object.keys(filters)) {
    const values = filters[field];
    if (values && values.length > 0) {
      if (values.length === 1) {
        queryParts.push(`${field}:${quoteLuceneValue(values[0])}`);
      } else {
        const orValues = values.map(value => `${field}:${quoteLuceneValue(value)}`).join(' OR ');
        queryParts.push(`(${orValues})`);
      }
    }
  }

  // Convert tags to query parts
  for (const tag of tags) {
    if (tag.provider && tag.key && tag.value) {
      // Use the new format: tag:provider.key=value
      queryParts.push(quoteTag(tag.provider, tag.key, tag.value));
    }
  }

  return queryParts.join(' AND ');
};

/**
 * Parse Lucene query string safely
 */
const parseLuceneQuery = (query: string): { filters: Filters; tags: Tag[] } => {
  if (!query.trim()) {
    return { filters: {}, tags: [] };
  }

  try {
    const ast = lucene.parse(query);
    return astToFiltersAndTags(ast);
  } catch {
    // Intentionally catch and ignore parse errors - invalid Lucene queries
    // should gracefully fall back to empty state rather than break the UI
    return { filters: {}, tags: [] };
  }
};

/**
 * Format date to YYYY-MM for URL
 */
const formatDateForUrl = (date: Date): string => {
  return format(date, 'yyyy-MM');
};

/**
 * Parse YYYY-MM from URL to Date (start of month)
 */
const parseStartDateFromUrl = (dateStr: string): Date | null => {
  try {
    return startOfMonth(parse(dateStr, 'yyyy-MM', new Date()));
  } catch {
    return null;
  }
};

/**
 * Parse YYYY-MM from URL to Date (end of month)
 */
const parseEndDateFromUrl = (dateStr: string): Date | null => {
  try {
    return endOfMonth(parse(dateStr, 'yyyy-MM', new Date()));
  } catch {
    return null;
  }
};

export interface InfraWalletLuceneUrlState {
  filters: Filters;
  selectedTags: Tag[];
  monthRange: MonthRange;
  granularity: string;
  aggregatedBy: string;
}

interface UseInfraWalletLuceneParamsOptions {
  defaultFilters?: Filters;
  defaultTags?: Tag[];
  defaultMonthRange?: MonthRange;
  defaultGranularity?: string;
  defaultAggregatedBy?: string;
}

/**
 * Custom hook to manage InfraWallet state in URL search params using Lucene query syntax
 * This enables deep linking and bookmarking of specific filter/view combinations
 */
export const useInfraWalletLuceneParams = (options: UseInfraWalletLuceneParamsOptions = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isInitialMount = useRef(true);

  /**
   * Get initial state from URL or use defaults
   */
  const getInitialState = useCallback((): InfraWalletLuceneUrlState => {
    // Parse Lucene query (URL decode first)
    const queryParam = searchParams.get('q') || '';
    const decodedQuery = decodeURIComponent(queryParam);
    const { filters, tags } = parseLuceneQuery(decodedQuery);

    // Use parsed values or defaults
    const finalFilters = Object.keys(filters).length > 0 ? filters : options.defaultFilters || {};
    const selectedTags = tags.length > 0 ? tags : options.defaultTags || [];

    // Month Range
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    let monthRange = options.defaultMonthRange;
    if (fromParam && toParam) {
      const startMonth = parseStartDateFromUrl(fromParam);
      const endMonth = parseEndDateFromUrl(toParam);
      if (startMonth && endMonth) {
        monthRange = { startMonth, endMonth };
      }
    }

    // Ensure monthRange is never undefined - provide a default
    if (!monthRange) {
      const currentMonth = startOfMonth(new Date());
      monthRange = { startMonth: currentMonth, endMonth: currentMonth };
    }

    // Granularity
    const granularityParam = searchParams.get('granularity');
    const granularity = granularityParam || options.defaultGranularity || 'monthly';

    const groupByParam = searchParams.get('groupBy');
    const aggregatedBy = groupByParam || options.defaultAggregatedBy || 'none';

    return {
      filters: finalFilters,
      selectedTags,
      monthRange,
      granularity,
      aggregatedBy,
    };
  }, [searchParams, options]);

  /**
   * Update URL search params with current state
   */
  const updateUrlState = useCallback(
    (state: Partial<InfraWalletLuceneUrlState>) => {
      setSearchParams(
        prev => {
          const newParams = new URLSearchParams(prev);

          // Update Lucene query if filters or tags changed
          if (state.filters !== undefined || state.selectedTags !== undefined) {
            // Get current state to merge with new state
            const currentQuery = prev.get('q') || '';
            const decodedCurrentQuery = decodeURIComponent(currentQuery);
            const { filters: currentFilters, tags: currentTags } = parseLuceneQuery(decodedCurrentQuery);

            const finalFilters = state.filters ?? currentFilters;
            const finalTags = state.selectedTags ?? currentTags;

            const luceneQuery = filtersAndTagsToLucene(finalFilters, finalTags);
            if (luceneQuery) {
              // URL encode the query before setting it
              newParams.set('q', encodeURIComponent(luceneQuery));
            } else {
              newParams.delete('q');
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

  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  return {
    getInitialState,
    updateUrlState,
    isInitialMount: isInitialMount.current,
  };
};
