import type { AxiosRequestConfig } from 'axios'
import { api } from './api'
import { isPositiveInteger, isNonEmptyString } from '../utils/validation'
import type { GenerateReportRequest, GenerateReportResponse, ReportFilters, PaginatedReports } from '../types/report'

export async function generateReport(body: GenerateReportRequest, config?: AxiosRequestConfig): Promise<GenerateReportResponse> {
  if (!body) {
    throw new Error('Request body must be provided');
  }

  if (!isNonEmptyString(body.reportName)) {
    throw new Error('Report name must be provided');
  }

  if (body.selectedIds) {
    body.selectedIds.forEach((id) => {
      if (!isPositiveInteger(id)) throw new Error('Invalid selected ID');
    });
  }

  if (body.excludedIds) {
    body.excludedIds.forEach((id) => {
      if (!isPositiveInteger(id)) throw new Error('Invalid excluded ID');
    });
  }

  const response = await api.post<GenerateReportResponse>('/api/v1/reports/generate', body, config)
  return response.data
}

export async function getReports(filters?: ReportFilters, config?: AxiosRequestConfig): Promise<PaginatedReports> {
  if (filters) {
    if (filters.page && !isPositiveInteger(filters.page)) {
      throw new Error('Invalid page number');
    }
    if (filters.limit && !isPositiveInteger(filters.limit)) {
      throw new Error('Invalid limit number');
    }
  }
  const response = await api.get<PaginatedReports>('/api/v1/reports', { params: filters, ...config })
  return response.data
}


