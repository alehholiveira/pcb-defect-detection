import { api } from './api'

export interface GenerateReportFilters {
  startDate?: string
  endDate?: string
  modelName?: string
  defectType?: string
}

export interface GenerateReportRequest {
  reportName: string
  selectedIds?: number[]
  excludedIds?: number[]
  filters?: GenerateReportFilters
}

export interface GenerateReportResponse {
  message: string
  inferenceCount: number
  messageId: string
}

export interface ReportMetadata {
  reportName: string
  filename: string
  downloadUrl: string
  generatedAt: string
  reportType: 'daily' | 'weekly' | 'monthly' | 'manual'
  periodStart: string
  periodEnd: string
  totalInferences: number
  totalImages: number
  totalDefects: number
  defectsByType: Record<string, number>
  generatedBy: string
}

export interface ReportFilters {
  reportType?: 'all' | 'automatic' | 'manual' | 'daily' | 'weekly' | 'monthly'
  startDate?: string
  endDate?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface PaginatedReports {
  data: ReportMetadata[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export async function generateReport(body: GenerateReportRequest): Promise<GenerateReportResponse> {
  const response = await api.post<GenerateReportResponse>('/api/v1/reports/generate', body)
  return response.data
}

export async function getReports(filters?: ReportFilters): Promise<PaginatedReports> {
  const response = await api.get<PaginatedReports>('/api/v1/reports', { params: filters })
  return response.data
}
