import type { AxiosRequestConfig } from 'axios'
import { api } from './api'
import type {
  PredictionResponse,
  Inference,
  InferenceFilters,
  PaginatedResponse,
} from '../types/inference'
import { AVAILABLE_MODELS } from '../types/inference'
import { isPositiveInteger, isNonEmptyString } from '../utils/validation'

export async function runInference(
  files: File[],
  modelName: string,
  confidence?: number
): Promise<PredictionResponse> {
  if (!files || files.length === 0) {
    throw new Error('At least one file must be selected for inference');
  }
  
  files.forEach((file) => {
    if (!file.type.startsWith('image/')) {
      throw new Error(`File ${file.name} is not an image`);
    }
  });

  if (!isNonEmptyString(modelName)) {
    throw new Error('Model name must be provided');
  }

  const isValidModel = AVAILABLE_MODELS.some((m) => m.value === modelName);
  if (!isValidModel) {
    throw new Error(`Invalid model name: ${modelName}`);
  }

  if (confidence !== undefined && (confidence < 0 || confidence > 1)) {
    throw new Error('Confidence must be between 0 and 1');
  }

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
  filters?: InferenceFilters,
  config?: AxiosRequestConfig
): Promise<PaginatedResponse<Inference>> {
  const params = new URLSearchParams()
  if (filters) {
    if (filters.page) {
      if (!isPositiveInteger(filters.page)) throw new Error('Invalid page number');
      params.append('page', String(filters.page));
    }
    if (filters.limit) {
      if (!isPositiveInteger(filters.limit)) throw new Error('Invalid limit number');
      params.append('limit', String(filters.limit));
    }
    if (filters.modelName) params.append('modelName', filters.modelName)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.defectType) params.append('defectType', filters.defectType)
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)
    if (filters.search) params.append('search', filters.search)
  }

  const response = await api.get<PaginatedResponse<Inference>>('/api/v1/inferences', {
    params,
    ...config,
  })
  return response.data
}

export async function getInferenceById(id: number, config?: AxiosRequestConfig): Promise<Inference> {
  if (!isPositiveInteger(id)) {
    throw new Error('Invalid inference ID');
  }
  const response = await api.get<Inference>(`/api/v1/inferences/${id}`, config)
  return response.data
}


