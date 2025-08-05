'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from './fetchWithRetry';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseApiOptions {
  retries?: number;
  backoffMs?: number;
  enabled?: boolean;
}

export function useApi<T>(
  url: string | null,
  options: UseApiOptions = {}
): ApiState<T> {
  const { retries = 3, backoffMs = 500, enabled = true } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!url || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithRetry(url, {}, retries, backoffMs);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'データの取得に失敗しました';
      setError(errorMessage);
      console.error('API call failed:', err);
    } finally {
      setLoading(false);
    }
  }, [url, retries, backoffMs, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}

export function useFetch<T>(
  url: string | null,
  options: UseApiOptions = {}
): ApiState<T> {
  return useApi<T>(url, options);
}