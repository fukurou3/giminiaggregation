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
        let errorDetails = `HTTP ${response.status}`;
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorDetails += `: ${errorData.error}`;
          }
          if (errorData.details) {
            errorDetails += ` (${errorData.details})`;
          }
          console.error('API Error Response:', {
            url,
            status: response.status,
            statusText: response.statusText,
            errorData
          });
        } catch {
          // JSON解析に失敗した場合はテキストとして取得を試行
          try {
            const errorText = await response.text();
            if (errorText) {
              errorDetails += `: ${errorText}`;
            }
          } catch {
            // テキスト取得も失敗した場合はデフォルトメッセージ
            errorDetails += `: ${response.statusText}`;
          }
        }
        
        throw new Error(errorDetails);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'データの取得に失敗しました';
      setError(errorMessage);
      console.error('API call failed:', {
        url,
        error: err,
        message: errorMessage
      });
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