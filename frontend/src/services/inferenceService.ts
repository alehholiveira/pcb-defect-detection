import { api } from './api'
import type {
  PredictionResponse,
  Inference,
  InferenceFilters,
  PaginatedResponse,
} from '../types/inference'

export async function runInference(
  files: File[],
  modelName: string,
  confidence?: number
): Promise<PredictionResponse> {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })

  const params = new URLSearchParams()
  params.append('model_name', modelName)
  if (confidence !== undefined) {
    params.append('confidence', String(confidence))
  }

  const response = await api.post<PredictionResponse>('ml-service/predict', formData, {
    params,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function getInferences(
  filters?: InferenceFilters
): Promise<PaginatedResponse<Inference>> {
  const params = new URLSearchParams()
  if (filters) {
    if (filters.page) params.append('page', String(filters.page))
    if (filters.limit) params.append('limit', String(filters.limit))
    if (filters.modelName) params.append('modelName', filters.modelName)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.defectType) params.append('defectType', filters.defectType)
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)
    if (filters.search) params.append('search', filters.search) // Might be ignored by backend if not configured, but keep it for UI sync
  }

  const response = await api.get<PaginatedResponse<Inference>>('/api/v1/inferences', {
    params,
  })
  return response.data
}
