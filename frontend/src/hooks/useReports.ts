import { useState, useCallback, useEffect } from 'react';
import { getReports, type ReportFilters, type PaginatedReports } from '../services/reportService';

export interface UseReportsReturn {
  reportsData: PaginatedReports | null;
  filters: ReportFilters;
  loading: boolean;
  error: Error | null;
  setFilters: (filters: Partial<ReportFilters>) => void;
  fetchReports: () => Promise<void>;
}

export function useReports(initialFilters: ReportFilters = {}): UseReportsReturn {
  const [reportsData, setReportsData] = useState<PaginatedReports | null>(null);
  const [filters, setFiltersState] = useState<ReportFilters>({
    page: 1,
    limit: 10,
    ...initialFilters,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const setFilters = useCallback((newFilters: Partial<ReportFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getReports(filters);
      setReportsData(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch reports'));
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    reportsData,
    filters,
    loading,
    error,
    setFilters,
    fetchReports,
  };
}
