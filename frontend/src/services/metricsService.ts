import { api } from './api';
import type { MetricsFilters, MetricsResponse } from '../types/metrics';

export async function getMetrics(filters?: MetricsFilters): Promise<MetricsResponse> {
  const response = await api.get<MetricsResponse>('/api/v1/metrics', { params: filters });
  return response.data;
}
