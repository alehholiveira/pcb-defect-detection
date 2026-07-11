import type { AxiosRequestConfig } from 'axios'
import { api } from './api'
import type {
  PredictionResponse,
  Inference,
  InferenceFilters,
  PaginatedResponse,
} from '../types/inference'
import { AVAILABLE_MODELS } from '../types/inference'
import { validateSchema } from '../utils/validation'
import { z } from 'zod'

export const InferenceRunSchema = z.object({
  files: z.array(z.custom<File>(val => val instanceof File, 'Must be a File object'))
    .min(1, 'At least one file must be selected for inference')
    .refine(files => files.every(f => f.type.startsWith('image/')), {
      message: 'All selected files must be images',
    }),
  modelName: z.string().refine(val => AVAILABLE_MODELS.some(m => m.value === val), {
    message: 'Invalid model name selected',
  }),
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1').optional(),
})

export const InferenceFiltersSchema = z.object({
  page: z.number().int().positive('Page number must be positive').optional(),
  limit: z.number().int().positive('Limit number must be positive').optional(),
  modelName: z.string().optional(),
  startDate: z.string().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid start date format').optional(),
  endDate: z.string().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid end date format').optional(),
  defectType: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
})

export const InferenceIdSchema = z.number().int().positive('Invalid inference ID')

export async function runInference(
  files: File[],
  modelName: string,
  confidence?: number
): Promise<PredictionResponse> {
  validateSchema(InferenceRunSchema, { files, modelName, confidence })

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
    validateSchema(InferenceFiltersSchema, filters)
    if (filters.page) params.append('page', String(filters.page))
    if (filters.limit) params.append('limit', String(filters.limit))
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
  validateSchema(InferenceIdSchema, id)
  const response = await api.get<Inference>(`/api/v1/inferences/${id}`, config)
  return response.data
}

export async function deleteInference(id: number): Promise<void> {
  validateSchema(InferenceIdSchema, id)
  await api.delete(`/api/v1/inferences/${id}`)
}



