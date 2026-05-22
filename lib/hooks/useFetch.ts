'use client';

import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import { apiClient } from '@/lib/api/api-client';
import { getErrorMessage } from '@/lib/utils';

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseFetchOptions {
  skip?: boolean;
  refetchInterval?: number;
}

/**
 * Custom hook for fetching data
 * Handles loading, error, and data states automatically
 */
export function useFetch<T = unknown>(
  url: string | null,
  options?: UseFetchOptions
): UseFetchState<T> {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!url || options?.skip) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await apiClient.get<T>(url);
      setState({ data: response.data, loading: false, error: null });
    } catch (err) {
      const error = err instanceof AxiosError ? new Error(err.message) : new Error(getErrorMessage(err));
      setState({ data: null, loading: false, error });
    }
  }, [url, options?.skip]);

  useEffect(() => {
    fetchData();

    // Set up refetch interval if specified
    if (options?.refetchInterval) {
      const interval = setInterval(fetchData, options.refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, options?.refetchInterval]);

  return state;
}
