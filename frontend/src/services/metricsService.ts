import { api } from './api';
import type { AxiosRequestConfig } from 'axios';
import type { MetricsFilters, MetricsResponse } from '../types/metrics';
import { z } from 'zod';
import { validateSchema } from '../utils/validation';

export const MetricsFiltersSchema = z.object({
  startDate: z.string().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid start date format').optional(),
  endDate: z.string().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid end date format').optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).optional(),
  modelName: z.string().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['startDate'],
});

export async function getMetrics(filters?: MetricsFilters, config?: AxiosRequestConfig): Promise<MetricsResponse> {
  if (filters) {
    validateSchema(MetricsFiltersSchema, filters);
  }
  const response = await api.get<MetricsResponse>('/api/v1/metrics', { params: filters, ...config });
  return response.data;
}

