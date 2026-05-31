export interface Detection {
  id?: number
  class_name: string
  confidence: number
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface InferenceImage {
  id: number
  inference_id: number
  image_name: string
  total_detections: number
  image_url: string
  detections: Detection[]
}

export interface Inference {
  id: number
  model_name: string
  inference_time_ms: number
  total_detections: number
  created_at: string
  updated_at: string
  images: InferenceImage[]
}

export interface PredictionImage {
  image_name: string
  total_detections: number
  image_url: string
  detections: Detection[]
}

export interface PredictionResponse {
  model_name: string
  inference_time_ms: number
  total_detections: number
  images: PredictionImage[]
}

export interface InferenceFilters {
  page?: number
  limit?: number
  modelName?: string
  startDate?: string
  endDate?: string
  defectType?: string
  sortOrder?: 'asc' | 'desc'
  search?: string // Local frontend filter or future use
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export const AVAILABLE_MODELS = [
  { value: 'yolo11', label: 'YOLOv11' },
  { value: 'faster_rcnn', label: 'Faster R-CNN' },
  { value: 'retinanet', label: 'RetinaNet' },
  { value: 'rt_detr', label: 'RT-DETR' },
] as const

export const DEFECT_CLASSES = [
  'missing_hole',
  'mouse_bite',
  'open_circuit',
  'short',
  'spur',
  'spurious_copper',
] as const

export type DefectClass = (typeof DEFECT_CLASSES)[number]
