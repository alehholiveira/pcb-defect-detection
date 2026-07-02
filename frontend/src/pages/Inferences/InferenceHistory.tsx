import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search,
  SlidersHorizontal,
  Eye,
  Download,
  Trash2,
  RefreshCcw,
  FileText,
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
import { ToastContainer, type ToastData } from '../../components/Toast'
import { useInferenceSelection } from '../../hooks/useInferenceSelection'
import { generateReport } from '../../services/reportService'
import type {
  Inference,
  InferenceFilters,
  PaginatedResponse,
} from '../../types/inference'
import { AVAILABLE_MODELS } from '../../types/inference'
import './InferenceHistory.css'

interface InferenceHistoryProps {
  historyData: PaginatedResponse<Inference> | null
  historyFilters: InferenceFilters
  historyLoading: boolean
  onFiltersChange: (filters: Partial<InferenceFilters>) => void
  onFetchHistory: () => Promise<void>
  onReplayInference?: (id: number) => void
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
  const [searchValue, setSearchValue] = useState(historyFilters.search ?? '')
  const [showFilters, setShowFilters] = useState(false)
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

  // Toasts state
  const [toasts, setToasts] = useState<ToastData[]>([])
  
  const addToast = useCallback((message: string, variant: ToastData['variant']) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, variant }])
  }, [])
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

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
    { value: '', label: t('inference.history.filter.allModels', 'Todos os Modelos') },
    ...AVAILABLE_MODELS.map(m => ({ value: m.value, label: m.label }))
  ]

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value)
      onFiltersChange({ search: value || undefined, page: 1 })
    },
    [onFiltersChange]
  )

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
      addToast(t('toast.reportNameRequired', 'Por favor, forneça um nome para o relatório.'), 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = getRequestPayload(reportName.trim(), historyFilters)
      await generateReport(payload)
      
      addToast(t('toast.reportRequested', 'Geração do relatório solicitada com sucesso!'), 'success')
      setIsModalOpen(false)
      clearSelection()
    } catch (error) {
      addToast(t('toast.reportRequestFailed', 'Falha ao solicitar a geração do relatório. Tente novamente.'), 'error')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }, [reportName, historyFilters, getRequestPayload, addToast, t, clearSelection])

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
              aria-label={t('inference.history.selectAll', 'Selecionar Todas')}
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
              aria-label={`Select ${row.id}`}
            />
          </div>
        )
      },
      {
        key: 'id',
        label: t('inference.history.columns.id', 'ID'),
        width: '100px',
        sortable: true,
        render: (_: number, row: Inference) => (
          <span className="inference-history__id">INF-{row.id}</span>
        ),
      },
      {
        key: 'created_at',
        label: t('inference.history.columns.date', 'Data'),
        sortable: true,
        render: (value: string) => formatDate(value),
      },
      {
        key: 'model_name',
        label: t('inference.history.columns.model', 'Modelo'),
        sortable: true,
        render: (value: string) => (
          <span className="inference-history__model">{value}</span>
        ),
      },
      {
        key: 'images',
        label: t('inference.history.columns.images', 'Imagens'),
        width: '90px',
        sortable: true,
        render: (_: unknown, row: Inference) => row.images.length,
      },
      {
        key: 'total_detections',
        label: t('inference.history.columns.defects', 'Defeitos'),
        width: '90px',
        sortable: true,
      },
      {
        key: 'avg_confidence',
        label: t('inference.history.columns.avgConfidence', 'Confiança Média'),
        width: '140px',
        sortable: true,
        render: (_: unknown, row: Inference) => computeAvgConfidence(row),
      },
      {
        key: 'inference_time_ms',
        label: t('inference.history.columns.execTime', 'Tempo'),
        width: '100px',
        sortable: true,
        render: (value: number) => `${(value / 1000).toFixed(2)}s`,
      },
      {
        key: 'status',
        label: t('inference.history.columns.status', 'Status'),
        width: '110px',
        render: () => (
          <Badge variant="success" dot>
            {t('inference.history.status.completed', 'Concluído')}
          </Badge>
        ),
      },
      {
        key: 'actions',
        label: t('inference.history.columns.actions', 'Ações'),
        width: '120px',
        render: (_: unknown, row: Inference) => (
          <div className="inference-history__actions">
            <button
              className="inference-history__action-btn"
              aria-label={t('inference.history.view', 'Visualizar')}
              title={t('inference.history.view', 'Visualizar')}
              onClick={() => onReplayInference && onReplayInference(row.id)}
            >
              <Eye size={16} />
            </button>
            <button
              className="inference-history__action-btn"
              aria-label={t('inference.history.download', 'Baixar')}
              title={t('inference.history.download', 'Baixar')}
            >
              <Download size={16} />
            </button>
            <button
              className="inference-history__action-btn inference-history__action-btn--danger"
              aria-label={t('inference.history.delete', 'Excluir')}
              title={t('inference.history.delete', 'Excluir')}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
      },
    ],
    [t, onReplayInference, isAllSelected, toggleSelectAll, isSelected, toggleSelect]
  )

  const data = historyData?.data || []
  
  const sortedData = useMemo(() => {
    if (!data.length) return []
    return [...data].sort((a, b) => {
      let aVal: any = a[sortConfig.key as keyof Inference]
      let bVal: any = b[sortConfig.key as keyof Inference]

      if (sortConfig.key === 'images') {
        aVal = a.images.length
        bVal = b.images.length
      } else if (sortConfig.key === 'total_detections') {
        aVal = a.total_detections
        bVal = b.total_detections
      } else if (sortConfig.key === 'avg_confidence') {
        aVal = parseFloat(computeAvgConfidence(a))
        bVal = parseFloat(computeAvgConfidence(b))
      } else if (sortConfig.key === 'inference_time_ms') {
        aVal = a.inference_time_ms
        bVal = b.inference_time_ms
      } else if (sortConfig.key === 'created_at') {
        aVal = new Date(a.created_at).getTime()
        bVal = new Date(b.created_at).getTime()
      }

      if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortConfig])

  return (
    <div className="inference-history">
      <Card
        title={t('inference.history.title', 'Histórico de Inferências')}
        subtitle={t(
          'inference.history.subtitle',
          'Visualize e gerencie inferências anteriores'
        )}
        headerAction={
          <div className="inference-history__header-actions">
            <div className="inference-history__generate-btn">
              <Button
                variant="primary"
                size="sm"
                icon={<FileText size={16} />}
                disabled={selectionMode === 'none'}
                onClick={handleGenerateReportClick}
                aria-label={t('inference.history.generateReport', 'Gerar Relatório')}
              >
                {t('inference.history.generateReport', 'Gerar Relatório')}
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
              aria-label={t('inference.history.refresh', 'Atualizar')}
            >
              {t('inference.history.refresh', 'Atualizar')}
            </Button>
            <Input
              placeholder={t('inference.history.search', 'Buscar...')}
              icon={<Search size={16} />}
              value={searchValue}
              onChange={handleSearchChange}
              className="inference-history__search"
            />
            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              size="sm"
              icon={<SlidersHorizontal size={16} />}
              aria-label={t('inference.history.filters', 'Filtros')}
              onClick={() => setShowFilters(!showFilters)}
            >
              {t('inference.history.filters', 'Filtros')}
            </Button>
          </div>
        }
      >
        {showFilters && (
          <div className="inference-history__filters-panel">
            <DateRangePicker
              label={t('inference.history.filter.period', 'Período')}
              startDate={localFilters.startDate ?? ''}
              endDate={localFilters.endDate ?? ''}
              onStartDateChange={(val) => setLocalFilters(prev => ({ ...prev, startDate: val || undefined }))}
              onEndDateChange={(val) => setLocalFilters(prev => ({ ...prev, endDate: val || undefined }))}
            />
            <Select
              label={t('inference.history.filter.model', 'Modelo')}
              options={modelOptions}
              value={localFilters.modelName ?? ''}
              onChange={(val) => setLocalFilters(prev => ({ ...prev, modelName: val || undefined }))}
            />
            <div className="inference-history__filters-actions">
              <Button
                variant="ghost"
                onClick={handleResetFilters}
                className="inference-history__filters-clear"
              >
                {t('inference.history.filter.reset', 'Resetar')}
              </Button>
              <Button
                variant="primary"
                onClick={handleApplyFilters}
              >
                {t('inference.history.filter.apply', 'Aplicar')}
              </Button>
            </div>
          </div>
        )}
        <Table
          columns={columns}
          data={sortedData}
          loading={historyLoading}
          sortField={sortConfig.key}
          sortOrder={sortConfig.order}
          onSort={handleSort}
          emptyMessage={t(
            'inference.history.empty',
            'Nenhuma inferência encontrada'
          )}
          emptyDescription={t(
            'inference.history.emptyDesc',
            'Execute uma inferência para ver os resultados aqui.'
          )}
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
        title={t('inference.history.modal.title', 'Gerar Relatório Manual')}
        size="md"
      >
        <div className="inference-history__modal-content">
          <p className="inference-history__modal-text">
            {selectionMode === 'all' 
              ? t('inference.history.modal.allInferencesIncluded', 'Todas as {{count}} inferência(s) que correspondem aos filtros atuais serão incluídas.', { count: selectionCount })
              : t('inference.history.modal.inferencesIncluded', '{{count}} inferência(s) será(ão) incluída(s) no relatório.', { count: selectionCount })
            }
          </p>
          
          <Input
            label={t('inference.history.modal.reportNameLabel', 'Nome do Relatório')}
            placeholder={t('inference.history.modal.reportNamePlaceholder', 'Ex.: Lote de Inspeção #42')}
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
              {t('inference.history.modal.cancel', 'Cancelar')}
            </Button>
            <Button
              variant="primary"
              onClick={submitGenerateReport}
              disabled={isSubmitting || !reportName.trim()}
              loading={isSubmitting}
            >
              {t('inference.history.modal.confirm', 'Gerar Relatório')}
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}
