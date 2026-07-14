import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Eye,
  Trash2,
  RefreshCcw,
  FileText,
  Filter
} from 'lucide-react'
import { Card } from '../../components/Card'
import { Table } from '../../components/Table'
import { Pagination } from '../../components/Pagination'
import { Badge } from '../../components/Badge'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Select } from '../../components/Select'
import { DateRangePicker } from '../../components/DateRangePicker'
import { Modal } from '../../components/Modal'
import { ToastContainer } from '../../components/Toast'
import { useInferenceSelection } from '../../hooks/useInferenceSelection'
import { generateReport } from '../../services/reportService'
import { deleteInference } from '../../services/inferenceService'
import type {
  Inference,
  InferenceFilters,
  PaginatedResponse,
} from '../../types/inference'
import { AVAILABLE_MODELS } from '../../types/inference'
import { formatDateTime } from '../../utils/formatDate'
import { useToast } from '../../hooks/useToast'
import './InferenceHistory.css'

interface InferenceHistoryProps {
  historyData: PaginatedResponse<Inference> | null
  historyFilters: InferenceFilters
  historyLoading: boolean
  onFiltersChange: (filters: Partial<InferenceFilters>) => void
  onFetchHistory: () => Promise<void>
  onReplayInference?: (id: number) => void
}

function computeAvgConfidence(inference: Inference): string {
  const allConf = inference.images.flatMap((img) =>
    img.detections.map((d) => d.confidence)
  )
  if (allConf.length === 0) return '0.0%'
  const avg = allConf.reduce((s, c) => s + c, 0) / allConf.length
  return `${(avg * 100).toFixed(1)}%`
}

export function InferenceHistory({
  historyData,
  historyFilters,
  historyLoading,
  onFiltersChange,
  onFetchHistory,
  onReplayInference,
}: InferenceHistoryProps) {
  const { t } = useTranslation()
  const [localFilters, setLocalFilters] = useState({
    startDate: historyFilters.startDate,
    endDate: historyFilters.endDate,
    modelName: historyFilters.modelName,
  })
  const [sortConfig, setSortConfig] = useState<{ key: string; order: 'asc' | 'desc' }>({
    key: 'created_at',
    order: 'desc',
  })

  // Modal e form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [reportName, setReportName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inferenceToDelete, setInferenceToDelete] = useState<number | null>(null)

  // Toast hook
  const { toasts, addToast, removeToast } = useToast()

  const meta = historyData?.meta
  const totalInferences = meta?.total || 0

  const {
    selectionMode,
    isSelected,
    toggleSelect,
    toggleSelectAll,
    isAllSelected,
    isIndeterminate,
    selectionCount,
    clearSelection,
    getRequestPayload
  } = useInferenceSelection(totalInferences)

  const headerCheckboxRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate
    }
  }, [isIndeterminate])

  const modelOptions = [
    { value: '', label: t('inference.history.filter.allModels') },
    ...AVAILABLE_MODELS.map(m => ({ value: m.value, label: m.label }))
  ]


  const handlePageChange = useCallback(
    (page: number) => {
      onFiltersChange({ page })
    },
    [onFiltersChange]
  )

  const handleItemsPerPageChange = useCallback(
    (limit: number) => {
      onFiltersChange({ limit, page: 1 })
    },
    [onFiltersChange]
  )

  const handleSort = useCallback(
    (field: string, order: 'asc' | 'desc') => {
      setSortConfig({ key: field, order })
    },
    []
  )

  const handleApplyFilters = useCallback(() => {
    clearSelection()
    onFiltersChange({ ...localFilters, page: 1 })
  }, [localFilters, clearSelection, onFiltersChange])

  const handleResetFilters = useCallback(() => {
    clearSelection()
    setLocalFilters({ startDate: undefined, endDate: undefined, modelName: undefined })
  }, [clearSelection])

  const handleGenerateReportClick = useCallback(() => {
    setReportName('')
    setIsModalOpen(true)
  }, [])

  const submitGenerateReport = useCallback(async () => {
    if (!reportName.trim()) {
      addToast('toast.reportNameRequired', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = getRequestPayload(reportName.trim(), historyFilters)
      await generateReport(payload)
      
      addToast('toast.reportRequested', 'success')
      setIsModalOpen(false)
      clearSelection()
    } catch (error) {
      addToast('toast.reportRequestFailed', 'error')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }, [reportName, historyFilters, getRequestPayload, addToast, t, clearSelection])

  const handleDeleteInference = useCallback(async () => {
    if (inferenceToDelete === null) return
    setIsSubmitting(true)
    try {
      await deleteInference(inferenceToDelete)
      addToast('toast.inferenceDeleted', 'success')
      setInferenceToDelete(null)
      clearSelection()
      await onFetchHistory()
    } catch (error) {
      addToast('toast.inferenceDeleteFailed', 'error')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }, [inferenceToDelete, onFetchHistory, addToast, t, clearSelection])

  const columns = useMemo(
    () => [
      {
        key: 'selection',
        label: (
          <div className="inference-history__checkbox-container">
            <input
              type="checkbox"
              ref={headerCheckboxRef}
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="inference-history__checkbox"
              aria-label={t('inference.history.selectAll')}
            />
          </div>
        ),
        width: '50px',
        render: (_: unknown, row: Inference) => (
          <div className="inference-history__checkbox-container">
            <input
              type="checkbox"
              checked={isSelected(row.id)}
              onChange={() => toggleSelect(row.id)}
              className="inference-history__checkbox"
              aria-label={t('inference.history.selectRow', { id: row.id })}
            />
          </div>
        )
      },
      {
        key: 'id',
        label: t('inference.history.columns.id'),
        width: '100px',
        sortable: true,
        render: (_: number, row: Inference) => (
          <span className="inference-history__id">INF-{row.id}</span>
        ),
      },
      {
        key: 'created_at',
        label: t('inference.history.columns.date'),
        sortable: true,
        render: (value: string) => formatDateTime(value),
      },
      {
        key: 'model_name',
        label: t('inference.history.columns.model'),
        sortable: true,
        render: (value: string) => (
          <span className="inference-history__model">{value}</span>
        ),
      },
      {
        key: 'images',
        label: t('inference.history.columns.images'),
        width: '90px',
        sortable: true,
        render: (_: unknown, row: Inference) => row.images.length,
      },
      {
        key: 'total_detections',
        label: t('inference.history.columns.defects'),
        width: '90px',
        sortable: true,
      },
      {
        key: 'avg_confidence',
        label: t('inference.history.columns.avgConfidence'),
        width: '140px',
        sortable: true,
        render: (_: unknown, row: Inference) => computeAvgConfidence(row),
      },
      {
        key: 'inference_time_ms',
        label: t('inference.history.columns.execTime'),
        width: '100px',
        sortable: true,
        render: (value: number) => `${(value / 1000).toFixed(2)}s`,
      },
      {
        key: 'status',
        label: t('inference.history.columns.status'),
        width: '110px',
        render: () => (
          <Badge variant="success" dot>
            {t('inference.history.status.completed')}
          </Badge>
        ),
      },
      {
        key: 'actions',
        label: t('inference.history.columns.actions'),
        width: '120px',
        render: (_: unknown, row: Inference) => (
          <div className="inference-history__actions">
            <button
              className="inference-history__action-btn"
              aria-label={t('inference.history.view')}
              title={t('inference.history.view')}
              onClick={() => onReplayInference && onReplayInference(row.id)}
            >
              <Eye size={16} />
            </button>
            <button
              className="inference-history__action-btn inference-history__action-btn--danger"
              aria-label={t('inference.history.delete')}
              title={t('inference.history.delete')}
              onClick={() => setInferenceToDelete(row.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
      },
    ],
    [t, onReplayInference, isAllSelected, toggleSelectAll, isSelected, toggleSelect, setInferenceToDelete]
  )

  const data = historyData?.data || []
  
  const sortedData = useMemo(() => {
    if (!data.length) return []
    return [...data].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      const key = sortConfig.key;
      if (key === 'images') {
        aVal = a.images.length
        bVal = b.images.length
      } else if (key === 'total_detections') {
        aVal = a.total_detections
        bVal = b.total_detections
      } else if (key === 'avg_confidence') {
        aVal = parseFloat(computeAvgConfidence(a))
        bVal = parseFloat(computeAvgConfidence(b))
      } else if (key === 'inference_time_ms') {
        aVal = a.inference_time_ms
        bVal = b.inference_time_ms
      } else if (key === 'created_at') {
        aVal = new Date(a.created_at).getTime()
        bVal = new Date(b.created_at).getTime()
      } else {
        const valA = a[key as keyof Inference];
        const valB = b[key as keyof Inference];
        aVal = typeof valA === 'string' || typeof valA === 'number' ? valA : '';
        bVal = typeof valB === 'string' || typeof valB === 'number' ? valB : '';
      }

      if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortConfig])

  return (
    <div className="inference-history__page-container">
      <div className="inference-history__page-header">
        <h1 className="inference-history__page-title">{t('inference.history.title')}</h1>
        <p className="inference-history__page-subtitle">{t('inference.history.subtitle')}</p>
      </div>

      <Card className="inference-history__filters-card">
        <div className="inference-history__filters-row">
          <DateRangePicker
            label={t('inference.history.filter.period')}
            startDate={localFilters.startDate ?? ''}
            endDate={localFilters.endDate ?? ''}
            onStartDateChange={(val) => setLocalFilters(prev => ({ ...prev, startDate: val || undefined }))}
            onEndDateChange={(val) => setLocalFilters(prev => ({ ...prev, endDate: val || undefined }))}
          />
          <Select
            label={t('inference.history.filter.model')}
            options={modelOptions}
            value={localFilters.modelName ?? ''}
            onChange={(val) => setLocalFilters(prev => ({ ...prev, modelName: val || undefined }))}
          />
        </div>

        <div className="inference-history__filters-actions">
          <Button
            variant="ghost"
            onClick={handleResetFilters}
            className="inference-history__filters-clear"
          >
            {t('inference.history.filter.reset')}
          </Button>
          <Button
            variant="primary"
            icon={<Filter size={16} />}
            onClick={handleApplyFilters}
          >
            {t('inference.history.filter.apply')}
          </Button>
        </div>
      </Card>

      <Card
        title={t('inference.history.title')}
        subtitle={t('inference.history.subtitle')}
        headerAction={
          <div className="inference-history__header-actions">
            <div className="inference-history__generate-btn">
              <Button
                variant="primary"
                size="sm"
                icon={<FileText size={16} />}
                disabled={selectionMode === 'none'}
                onClick={handleGenerateReportClick}
                aria-label={t('inference.history.generateReport')}
              >
                {t('inference.history.generateReport')}
              </Button>
              {selectionMode !== 'none' && (
                <span className="inference-history__selection-badge">
                  {selectionCount}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCcw size={16} />}
              onClick={() => { clearSelection(); onFetchHistory(); }}
              aria-label={t('inference.history.refresh')}
            >
              {t('inference.history.refresh')}
            </Button>
          </div>
        }
      >
        <Table
          columns={columns}
          data={sortedData}
          loading={historyLoading}
          sortField={sortConfig.key}
          sortOrder={sortConfig.order}
          onSort={handleSort}
          emptyMessage={t('inference.history.empty')}
          emptyDescription={t('inference.history.emptyDesc')}
        />

        {meta && meta.totalPages > 0 && (
          <div className="inference-history__pagination">
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              itemsPerPage={meta.limit}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>
        )}
      </Card>

      <Modal
        open={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={t('inference.history.modal.title')}
        size="md"
      >
        <div className="inference-history__modal-content">
          <p className="inference-history__modal-text">
            {selectionMode === 'all' 
              ? t('inference.history.modal.allInferencesIncluded', { total: selectionCount })
              : t('inference.history.modal.inferencesIncluded', { total: selectionCount })
            }
          </p>
          
          <Input
            label={t('inference.history.modal.reportNameLabel')}
            placeholder={t('inference.history.modal.reportNamePlaceholder')}
            value={reportName}
            onChange={setReportName}
            disabled={isSubmitting}
            autoFocus
          />

          <div className="inference-history__modal-actions">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              {t('inference.history.modal.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={submitGenerateReport}
              disabled={isSubmitting || !reportName.trim()}
              loading={isSubmitting}
            >
              {t('inference.history.modal.confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={inferenceToDelete !== null}
        onClose={() => !isSubmitting && setInferenceToDelete(null)}
        title={t('inference.history.deleteModal.title')}
        size="sm"
      >
        <div className="inference-history__modal-content">
          <p className="inference-history__modal-text">
            {inferenceToDelete !== null && t('inference.history.deleteModal.confirmText', { id: inferenceToDelete })}
          </p>
          <div className="inference-history__modal-actions">
            <Button
              variant="ghost"
              onClick={() => setInferenceToDelete(null)}
              disabled={isSubmitting}
            >
              {t('inference.history.deleteModal.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteInference}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {t('inference.history.deleteModal.confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}
