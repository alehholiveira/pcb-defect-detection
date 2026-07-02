import { useState, useMemo, useCallback } from 'react';
import { Download, RefreshCcw, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { Table } from '../../components/Table';
import { Pagination } from '../../components/Pagination';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Select } from '../../components/Select';
import { DateRangePicker } from '../../components/DateRangePicker';
import { ToastContainer, type ToastData } from '../../components/Toast';
import { useReports } from '../../hooks/useReports';
import type { ReportMetadata } from '../../services/reportService';
import './ReportTable.css';

const REPORT_TYPE_OPTIONS = [
  { value: 'all', label: 'reports.all' },
  { value: 'automatic', label: 'reports.automatic' },
  { value: 'manual', label: 'reports.manual' },
  { value: 'daily', label: 'reports.daily' },
  { value: 'weekly', label: 'reports.weekly' },
  { value: 'monthly', label: 'reports.monthly' },
];

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateOnly(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR');
}

export function ReportTable() {
  const { t } = useTranslation();
  const { reportsData, filters, loading, setFilters, fetchReports } = useReports();
  const [localFilters, setLocalFilters] = useState({
    startDate: filters.startDate,
    endDate: filters.endDate,
    reportType: filters.reportType || 'all',
  });
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, variant: ToastData['variant']) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handlePageChange = useCallback(
    (page: number) => {
      setFilters({ page });
    },
    [setFilters],
  );

  const handleItemsPerPageChange = useCallback(
    (limit: number) => {
      setFilters({ limit, page: 1 });
    },
    [setFilters],
  );

  const handleSort = useCallback(
    (field: string, order: 'asc' | 'desc') => {
      if (field === 'generatedAt') {
        setFilters({ sortOrder: order, page: 1 });
      }
    },
    [setFilters],
  );

  const handleApplyFilters = useCallback(() => {
    setFilters({ ...localFilters, page: 1 });
  }, [localFilters, setFilters]);

  const handleResetFilters = useCallback(() => {
    const reset = { startDate: undefined, endDate: undefined, reportType: 'all' as const };
    setLocalFilters(reset);
    setFilters({ ...reset, page: 1 });
  }, [setFilters]);

  const handleDownload = useCallback((url: string) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      addToast('Download URL not available.', 'error');
    }
  }, [addToast]);

  const columns = useMemo(
    () => [
      {
        key: 'reportName',
        label: t('reports.columns.reportName', 'Nome do Relatório'),
        render: (value: string, row: ReportMetadata) => (
          <div className="report-table__name-cell">
            <span className="report-table__name-primary">{value}</span>
            <span className="report-table__name-secondary">{row.filename}</span>
          </div>
        ),
      },
      {
        key: 'generatedAt',
        label: t('reports.columns.generationDate', 'Data de Geração'),
        sortable: true,
        width: '160px',
        render: (value: string) => formatDate(value),
      },
      {
        key: 'period',
        label: t('reports.columns.referencePeriod', 'Período de Referência'),
        width: '200px',
        render: (_: unknown, row: ReportMetadata) => {
          if (!row.periodStart || !row.periodEnd) return '-';
          if (row.periodStart === row.periodEnd) return formatDateOnly(row.periodStart);
          return `${formatDateOnly(row.periodStart)} - ${formatDateOnly(row.periodEnd)}`;
        },
      },
      {
        key: 'reportType',
        label: t('reports.columns.type', 'Tipo'),
        width: '120px',
        render: (value: string) => {
          const typeMap: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' | 'neutral' }> = {
            daily: { label: t('reports.daily', 'Diário'), variant: 'success' },
            weekly: { label: t('reports.weekly', 'Semanal'), variant: 'success' },
            monthly: { label: t('reports.monthly', 'Mensal'), variant: 'success' },
            manual: { label: t('reports.manual', 'Manual'), variant: 'neutral' },
          };
          const config = typeMap[value] || { label: value, variant: 'neutral' };
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'totalInferences',
        label: t('reports.columns.inspections', 'Inspeções'),
        width: '100px',
      },
      {
        key: 'totalDefects',
        label: t('reports.columns.defects', 'Defeitos'),
        width: '100px',
        render: (value: number) => (
          <span className={value > 0 ? 'report-table__defects-count' : ''}>{value}</span>
        ),
      },
      {
        key: 'defectsByType',
        label: t('reports.columns.defectsByType', 'Defeitos por Tipo'),
        width: '160px',
        render: (value: Record<string, number>) => {
          if (!value || Object.keys(value).length === 0) return '-';
          const defectLabels: Record<string, string> = {
            missing_hole: 'MH',
            mouse_bite: 'MB',
            open_circuit: 'OC',
            short: 'SH',
            spur: 'SP',
            spurious_copper: 'SC',
          };
          return (
            <div className="report-table__defects-by-type">
              {Object.entries(value).map(([type, count]) => {
                if (count === 0) return null;
                const abbr = defectLabels[type] || type.substring(0, 2).toUpperCase();
                return (
                  <div key={type} className="report-table__defect-dot" title={`${type}: ${count}`}>
                    <span className={`report-table__defect-dot-circle report-table__defect-dot-circle--${type}`} />
                    <span>
                      {abbr}: {count}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        },
      },
      {
        key: 'generatedBy',
        label: t('reports.columns.generatedBy', 'Gerado Por'),
        width: '180px',
        render: (value: string) => {
          if (value === 'system') return t('reports.generatedBySystem', 'Sistema (Automático)');
          if (value === 'manual') return t('reports.generatedByManual', 'Manual');
          return value;
        },
      },
      {
        key: 'actions',
        label: t('reports.columns.actions', 'Ações'),
        width: '80px',
        render: (_: unknown, row: ReportMetadata) => (
          <div className="report-table__actions">
            <button
              className="report-table__action-btn"
              aria-label={t('reports.download', 'Download')}
              title={t('reports.download', 'Download')}
              onClick={() => handleDownload(row.downloadUrl)}
            >
              <Download size={16} />
            </button>
          </div>
        ),
      },
    ],
    [t, handleDownload],
  );

  const data = reportsData?.data || [];
  const meta = reportsData?.meta;
  const totalItems = meta?.total || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="report-table__page-header">
        <h1 className="report-table__page-title">{t('reports.title', 'Relatórios')}</h1>
        <p className="report-table__page-subtitle">{t('reports.subtitle', 'Visualize e gerencie todos os relatórios de inspeção gerados no sistema.')}</p>
      </div>

      <Card className="report-table__filters-card">
        <div className="report-table__filters-row">
          <DateRangePicker
            label={t('reports.period', 'Período')}
            startDate={localFilters.startDate ?? ''}
            endDate={localFilters.endDate ?? ''}
            onStartDateChange={(val) => setLocalFilters((prev) => ({ ...prev, startDate: val || undefined }))}
            onEndDateChange={(val) => setLocalFilters((prev) => ({ ...prev, endDate: val || undefined }))}
          />
          <Select
            label={t('reports.reportType', 'Tipo de Relatório')}
            options={REPORT_TYPE_OPTIONS.map((opt) => ({ ...opt, label: t(opt.label) }))}
            value={localFilters.reportType || ''}
            onChange={(val) =>
              setLocalFilters((prev) => ({
                ...prev,
                reportType: (val as any) || undefined,
              }))
            }
          />
        </div>

        <div className="report-table__filters-actions" style={{ marginLeft: 'auto', marginTop: '8px' }}>
          <Button variant="secondary" onClick={handleResetFilters}>
            {t('reports.clearFilters', 'Limpar Filtros')}
          </Button>
          <Button variant="primary" icon={<Filter size={16} />} onClick={handleApplyFilters}>
            {t('reports.applyFilters', 'Aplicar Filtros')}
          </Button>
        </div>
      </Card>

      <Card
        title={t('reports.generated', 'Relatórios Gerados')}
        subtitle={`${totalItems} ${t('reports.title', 'Relatórios').toLowerCase()}`}
        headerAction={
          <div className="report-table__header-actions">
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCcw size={16} />}
              onClick={fetchReports}
              aria-label={t('reports.refresh', 'Atualizar')}
            >
              {t('reports.refresh', 'Atualizar')}
            </Button>
          </div>
        }
        noPadding
      >
        <Table
          columns={columns}
          data={data}
          loading={loading}
          sortField={filters.sortOrder ? 'generatedAt' : undefined}
          sortOrder={filters.sortOrder}
          onSort={handleSort}
          emptyMessage={t('reports.empty', 'Nenhum relatório encontrado')}
          emptyDescription={t(
            'reports.emptyDesc',
            'Os relatórios aparecerão aqui assim que forem gerados automática ou manualmente.'
          )}
        />

        {meta && meta.totalPages > 0 && (
          <div className="report-table__pagination-wrapper">
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
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
