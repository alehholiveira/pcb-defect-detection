import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search,
  SlidersHorizontal,
  Eye,
  Download,
  Trash2,
  RefreshCcw,
} from 'lucide-react'
import { Card } from '../../components/Card'
import { Table } from '../../components/Table'
import { Pagination } from '../../components/Pagination'
import { Badge } from '../../components/Badge'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Select } from '../../components/Select'
import { DateRangePicker } from '../../components/DateRangePicker'
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
}: InferenceHistoryProps) {
  const { t } = useTranslation()
  const [searchValue, setSearchValue] = useState(historyFilters.search ?? '')
  const [showFilters, setShowFilters] = useState(false)
  const [localFilters, setLocalFilters] = useState({
    startDate: historyFilters.startDate,
    endDate: historyFilters.endDate,
    modelName: historyFilters.modelName,
  })

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
    (_field: string, order: 'asc' | 'desc') => {
      // Backend only supports sortOrder currently, not sortField.
      // But we will pass it anyway in case it's updated.
      onFiltersChange({ sortOrder: order, page: 1 })
    },
    [onFiltersChange]
  )

  const handleApplyFilters = useCallback(() => {
    onFiltersChange({ ...localFilters, page: 1 })
  }, [localFilters, onFiltersChange])

  const handleResetFilters = useCallback(() => {
    setLocalFilters({ startDate: undefined, endDate: undefined, modelName: undefined })
  }, [])

  const columns = useMemo(
    () => [
      {
        key: 'id',
        label: t('inference.history.columns.id', 'ID'),
        width: '100px',
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
        render: (value: string) => (
          <span className="inference-history__model">{value}</span>
        ),
      },
      {
        key: 'images',
        label: t('inference.history.columns.images', 'Imagens'),
        width: '90px',
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
        width: '120px',
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
        render: () => (
          <div className="inference-history__actions">
            <button
              className="inference-history__action-btn"
              aria-label={t('inference.history.view', 'Visualizar')}
              title={t('inference.history.view', 'Visualizar')}
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
    [t]
  )

  const data = historyData?.data ?? []
  const meta = historyData?.meta

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
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCcw size={16} />}
              onClick={() => onFetchHistory()}
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
          data={data}
          loading={historyLoading}
          sortField="created_at"
          sortOrder={historyFilters.sortOrder || 'desc'}
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
    </div>
  )
}
