import { useState, useEffect, useCallback } from 'react'
import { runInference, getInferences, getInferenceById } from '../services/inferenceService'
import type {
  PredictionResponse,
  Inference,
  InferenceFilters,
  PaginatedResponse,
} from '../types/inference'

export interface FilePreview {
  file: File | null
  preview: string
  name: string
}

export interface UseInferenceReturn {
  selectedModel: string
  selectedFiles: File[]
  filePreviews: FilePreview[]
  resultPreviews: FilePreview[]
  isLoading: boolean
  predictionResult: PredictionResponse | null
  currentResultIndex: number
  historyData: PaginatedResponse<Inference> | null
  historyFilters: InferenceFilters
  historyLoading: boolean
  error: string | null
  setModel: (model: string) => void
  addFiles: (files: File[]) => void
  removeFile: (index: number) => void
  runInferenceAction: () => Promise<void>
  loadInferenceAction: (id: number) => Promise<void>
  clearResults: () => void
  clearFiles: () => void
  setHistoryFilters: (filters: Partial<InferenceFilters>) => void
  fetchHistory: () => Promise<void>
  setCurrentResultIndex: (index: number) => void
}

export function useInference(): UseInferenceReturn {
  const [selectedModel, setSelectedModel] = useState('yolo11')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [predictionResult, setPredictionResult] =
    useState<PredictionResponse | null>(null)
  const [resultPreviews, setResultPreviews] = useState<FilePreview[]>([])
  const [currentResultIndex, setCurrentResultIndex] = useState(0)
  const [historyData, setHistoryData] =
    useState<PaginatedResponse<Inference> | null>(null)
  const [historyFilters, setHistoryFiltersState] = useState<InferenceFilters>({
    page: 1,
    limit: 10,
  })
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate file previews when selectedFiles change
  useEffect(() => {
    const previews = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }))
    setFilePreviews(previews)

    return () => {
      previews.forEach((p) => {
        if (p.file) URL.revokeObjectURL(p.preview)
      })
    }
  }, [selectedFiles])

  // Cleanup result previews when they change or unmount
  useEffect(() => {
    return () => {
      resultPreviews.forEach((p) => {
        if (p.file) URL.revokeObjectURL(p.preview)
      })
    }
  }, [resultPreviews])

  const setModel = useCallback((model: string) => {
    setSelectedModel(model)
  }, [])

  const addFiles = useCallback((files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files])
    setError(null)
  }, [])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const runInferenceAction = useCallback(async () => {
    if (selectedFiles.length === 0) {
      setError('Selecione pelo menos uma imagem para análise.')
      return
    }

    setIsLoading(true)
    setError(null)
    setPredictionResult(null)
    setResultPreviews([])
    setCurrentResultIndex(0)

    try {
      const result = await runInference(selectedFiles, selectedModel)
      setPredictionResult(result)
      
      // Store dedicated previews for the results view, so they don't get
      // destroyed if the user clears the selected files dropzone
      setResultPreviews(
        selectedFiles.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
          name: file.name,
        }))
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao executar inferência.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [selectedFiles, selectedModel])

  const loadInferenceAction = useCallback(async (id: number) => {
    setIsLoading(true)
    setError(null)
    setPredictionResult(null)
    setResultPreviews([])
    setCurrentResultIndex(0)

    try {
      const inference = await getInferenceById(id)
      
      // Inference perfectly matches PredictionResponse structure
      setPredictionResult({
        model_name: inference.model_name,
        inference_time_ms: inference.inference_time_ms,
        total_detections: inference.total_detections,
        images: inference.images,
      })
      
      // Create previews using the S3 URLs
      setResultPreviews(
        inference.images.map((img) => ({
          file: null, // No local file available for history items
          preview: img.image_url,
          name: img.image_name,
        }))
      )
      
      // Optional: scroll to top to see results
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar inferência do histórico.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setPredictionResult(null)
    setResultPreviews([])
    setCurrentResultIndex(0)
    setSelectedFiles([])
    setError(null)
  }, [])

  const clearFiles = useCallback(() => {
    setSelectedFiles([])
  }, [])

  const setHistoryFilters = useCallback(
    (filters: Partial<InferenceFilters>) => {
      setHistoryFiltersState((prev) => ({ ...prev, ...filters }))
    },
    []
  )

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const data = await getInferences(historyFilters)
      setHistoryData(data)
    } catch (err) {
      console.error('Failed to fetch inference history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }, [historyFilters])

  // Fetch history on mount and when filters change
  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return {
    selectedModel,
    selectedFiles,
    filePreviews,
    resultPreviews,
    isLoading,
    predictionResult,
    currentResultIndex,
    historyData,
    historyFilters,
    historyLoading,
    error,
    setModel,
    addFiles,
    removeFile,
    runInferenceAction,
    loadInferenceAction,
    clearResults,
    clearFiles,
    setHistoryFilters,
    fetchHistory,
    setCurrentResultIndex,
  }
}
