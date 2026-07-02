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

export async function generateReport(body: GenerateReportRequest): Promise<GenerateReportResponse> {
  const response = await api.post<GenerateReportResponse>('/api/v1/reports/generate', body)
  return response.data
}
