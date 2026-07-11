import { api } from './api';
import type { AxiosRequestConfig } from 'axios';
import type { MetricsFilters, MetricsResponse } from '../types/metrics';

export async function getMetrics(filters?: MetricsFilters, config?: AxiosRequestConfig): Promise<MetricsResponse> {
  const response = await api.get<MetricsResponse>('/api/v1/metrics', { params: filters, ...config });
  return response.data;
}

