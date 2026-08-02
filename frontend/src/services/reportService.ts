import type { AxiosRequestConfig } from 'axios'
import { api } from './api'
import { validateSchema } from '../utils/validation'
import { z } from 'zod'
import type { GenerateReportRequest, GenerateReportResponse, ReportFilters, PaginatedReports } from '../types/report'

export const GenerateReportFiltersSchema = z.object({
  startDate: z.string().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid filter start date').optional(),
  endDate: z.string().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid filter end date').optional(),
  modelName: z.string().optional(),
  defectType: z.string().optional(),
})

export const GenerateReportRequestSchema = z.object({
  reportName: z.string().min(1, 'Report name must be provided'),
  selectedIds: z.array(z.number().int().positive('Selected ID must be a positive integer')).optional(),
  excludedIds: z.array(z.number().int().positive('Excluded ID must be a positive integer')).optional(),
  filters: GenerateReportFiltersSchema.optional(),
})

export const ReportFiltersSchema = z.object({
  reportType: z.enum(['all', 'automatic', 'manual', 'daily', 'weekly', 'monthly']).optional(),
  startDate: z.string().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid start date format').optional(),
  endDate: z.string().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid end date format').optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().positive('Page number must be positive').optional(),
  limit: z.number().int().positive('Limit number must be positive').optional(),
})

export async function generateReport(body: GenerateReportRequest, config?: AxiosRequestConfig): Promise<GenerateReportResponse> {
  validateSchema(GenerateReportRequestSchema, body)
  const response = await api.post<GenerateReportResponse>('/api/v1/reports/generate', body, config)
  return response.data
}

export async function getReports(filters?: ReportFilters, config?: AxiosRequestConfig): Promise<PaginatedReports> {
  if (filters) {
    validateSchema(ReportFiltersSchema, filters)
  }
  const response = await api.get<PaginatedReports>('/api/v1/reports', { params: filters, ...config })
  return response.data
}

export async function sendReportEmail(filename: string, recipients: string[], language: string): Promise<void> {
  await api.post(`/api/v1/reports/${filename}/send`, { recipients, language })
}

