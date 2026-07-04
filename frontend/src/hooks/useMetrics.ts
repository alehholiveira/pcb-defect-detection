import { useState, useEffect, useCallback } from 'react';
import { getMetrics } from '../services/metricsService';
import type { MetricsFilters, MetricsResponse } from '../types/metrics';

export function useMetrics(initialFilters?: MetricsFilters) {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<MetricsFilters>({
    granularity: 'daily',
    ...initialFilters,
  });

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMetrics(filters);
      setMetrics(data);
    } catch (err: any) {
      console.error('Failed to fetch metrics', err);
      setError(err.response?.data?.message || 'Failed to fetch metrics data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const updateFilters = useCallback((newFilters: Partial<MetricsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ granularity: 'daily' });
  }, []);

  return {
    metrics,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    refresh: fetchMetrics,
  };
}
