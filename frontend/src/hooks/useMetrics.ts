import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getMetrics } from '../services/metricsService';
import type { MetricsFilters, MetricsResponse } from '../types/metrics';
import { parseApiError } from '../utils/apiError';

export interface UseMetricsReturn {
  metrics: MetricsResponse | null;
  loading: boolean;
  error: string | null;
  filters: MetricsFilters;
  updateFilters: (newFilters: Partial<MetricsFilters>) => void;
  clearFilters: () => void;
  refresh: () => Promise<void>;
}

export function useMetrics(initialFilters?: MetricsFilters): UseMetricsReturn {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<MetricsFilters>({
    granularity: 'daily',
    ...initialFilters,
  });

  const fetchMetrics = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMetrics(filters, { signal });
      setMetrics(data);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'CanceledError') {
        return;
      }
      console.error('Failed to fetch metrics', err);
      const apiMsg = parseApiError(err);
      setError(apiMsg === 'An unexpected error occurred' ? t('metrics.errors.fetchFailed') : apiMsg);
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    const controller = new AbortController();
    fetchMetrics(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchMetrics]);

  const updateFilters = useCallback((newFilters: Partial<MetricsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ granularity: 'daily' });
  }, []);

  const refresh = useCallback(async () => {
    await fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    refresh,
  };
}

