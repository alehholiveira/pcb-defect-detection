import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getReports } from '../services/reportService';
import type { ReportFilters, PaginatedReports } from '../types/report';
import { parseApiError } from '../utils/apiError';

export interface UseReportsReturn {
  reportsData: PaginatedReports | null;
  filters: ReportFilters;
  loading: boolean;
  error: string | null;
  setFilters: (filters: Partial<ReportFilters>) => void;
  fetchReports: () => Promise<void>;
}

/**
 * Manages the asynchronous report generation and retrieval flow.
 * 
 * Architecture Flow:
 * 1. HTTP Request: Frontend sends report criteria.
 * 2. SQS: API Gateway enqueues the request to an SQS queue.
 * 3. Lambda: A worker Lambda processes the queue, aggregates data, and generates a PDF/CSV.
 * 4. S3 Upload: The Lambda uploads the generated file to S3.
 * 5. Result Available: Frontend polls/refreshes this hook to retrieve the finalized report URL.
 */
export function useReports(initialFilters: ReportFilters = {}): UseReportsReturn {
  const { t } = useTranslation();
  const [reportsData, setReportsData] = useState<PaginatedReports | null>(null);
  const [filters, setFiltersState] = useState<ReportFilters>({
    page: 1,
    limit: 10,
    ...initialFilters,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setFilters = useCallback((newFilters: Partial<ReportFilters>) => {
    setFiltersState((prev: ReportFilters) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const fetchReports = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getReports(filters, { signal });
      setReportsData(data);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'CanceledError') {
        return;
      }
      console.error('Error fetching reports:', err);
      const apiMsg = parseApiError(err);
      setError(apiMsg === 'An unexpected error occurred' ? t('reports.errors.fetchFailed') : apiMsg);
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    const controller = new AbortController();
    fetchReports(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchReports]);

  const refreshReports = useCallback(async () => {
    await fetchReports();
  }, [fetchReports]);

  return {
    reportsData,
    filters,
    loading,
    error,
    setFilters,
    fetchReports: refreshReports,
  };
}

