import { useState, useMemo, useCallback } from 'react';
import { Download, RefreshCcw, Filter, Search, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/Card';
import { Table } from '../../components/Table';
import { Pagination } from '../../components/Pagination';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Select } from '../../components/Select';
import { Input } from '../../components/Input';
import { DateRangePicker } from '../../components/DateRangePicker';
import { ToastContainer } from '../../components/Toast';
import { useReports } from '../../hooks/useReports';
import type { ReportMetadata, ReportFilters } from '../../types/report';
import { formatDateTime, formatDateOnly } from '../../utils/formatDate';
import { useToast } from '../../hooks/useToast';
import { SendReportEmailModal } from './SendReportEmailModal';
import './ReportTable.css';

const REPORT_TYPE_OPTIONS = [
  { value: 'all', label: 'reports.all' },
  { value: 'automatic', label: 'reports.automatic' },
  { value: 'manual', label: 'reports.manual' },
  { value: 'daily', label: 'reports.daily' },
  { value: 'weekly', label: 'reports.weekly' },
  { value: 'monthly', label: 'reports.monthly' },
];

export function ReportTable() {
  const { t } = useTranslation();
  const { reportsData, filters, loading, setFilters, fetchReports } = useReports();
  const [searchValue, setSearchValue] = useState('');
  const [localFilters, setLocalFilters] = useState<{
    startDate: string | undefined;
    endDate: string | undefined;
    reportType: ReportFilters['reportType'];
  }>({
    startDate: filters.startDate,
    endDate: filters.endDate,
    reportType: filters.reportType || 'all',
  });
  const { toasts, addToast, removeToast } = useToast();
  
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedReportForEmail, setSelectedReportForEmail] = useState<string | null>(null);

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
      addToast('reports.errors.downloadUrlUnavailable', 'error');
    }
  }, [addToast]);

  const handleOpenEmailModal = useCallback((filename: string) => {
    setSelectedReportForEmail(filename);
    setIsEmailModalOpen(true);
  }, []);

  const columns = useMemo(
    () => [
      {
        key: 'reportName',
        label: t('reports.columns.reportName'),
        sortable: true,
        render: (value: string, row: ReportMetadata) => (
          <div className="report-table__name-cell">
            <span className="report-table__name-primary">{value}</span>
            <span className="report-table__name-secondary">{row.filename}</span>
          </div>
        ),
      },
      {
        key: 'generatedAt',
        label: t('reports.columns.generationDate'),
        sortable: true,
        width: '160px',
        render: (value: string) => formatDateTime(value),
      },
      {
        key: 'period',
        label: t('reports.columns.referencePeriod'),
        sortable: true,
        width: '200px',
        render: (_: unknown, row: ReportMetadata) => {
          if (!row.periodStart || !row.periodEnd) return '-';
          if (row.periodStart === row.periodEnd) return formatDateOnly(row.periodStart);
          return `${formatDateOnly(row.periodStart)} - ${formatDateOnly(row.periodEnd)}`;
        },
      },
      {
        key: 'reportType',
        label: t('reports.columns.type'),
        sortable: true,
        width: '120px',
        render: (value: string) => {
          const typeMap: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'neutral' }> = {
            daily: { label: t('reports.daily'), variant: 'success' },
            weekly: { label: t('reports.weekly'), variant: 'success' },
            monthly: { label: t('reports.monthly'), variant: 'success' },
            manual: { label: t('reports.manual'), variant: 'neutral' },
          };
          const config = typeMap[value] || { label: value, variant: 'neutral' };
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'totalInferences',
        label: t('reports.columns.inspections'),
        sortable: true,
        width: '100px',
      },
      {
        key: 'totalDefects',
        label: t('reports.columns.defects'),
        sortable: true,
        width: '100px',
        render: (value: number) => (
          <span className={value > 0 ? 'report-table__defects-count' : ''}>{value}</span>
        ),
      },
      {
        key: 'defectsByType',
        label: t('reports.columns.defectsByType'),
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
        label: t('reports.columns.generatedBy'),
        sortable: true,
        width: '180px',
        render: (value: string) => {
          if (value === 'system') return t('reports.generatedBySystem');
          if (value === 'manual') return t('reports.generatedByManual');
          return value;
        },
      },
      {
        key: 'actions',
        label: t('reports.columns.actions'),
        width: '100px',
        render: (_: unknown, row: ReportMetadata) => (
          <div className="report-table__actions">
            <button
              className="report-table__action-btn"
              aria-label={t('reports.sendEmail')}
              title={t('reports.sendEmail')}
              onClick={() => handleOpenEmailModal(row.filename.replace('.pptx', '.json'))}
            >
              <Mail size={16} />
            </button>
            <button
              className="report-table__action-btn"
              aria-label={t('reports.download')}
              title={t('reports.download')}
              onClick={() => handleDownload(row.downloadUrl)}
            >
              <Download size={16} />
            </button>
          </div>
        ),
      },
    ],
    [t, handleDownload, handleOpenEmailModal],
  );

  const data = reportsData?.data || [];
  const meta = reportsData?.meta;
  const totalItems = meta?.total || 0;

  const [sortConfig, setSortConfig] = useState<{ key: string, order: 'asc' | 'desc' }>({ key: 'generatedAt', order: 'desc' });
  const handleSort = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortConfig({ key: field, order });
  }, []);

  const sortedData = useMemo(() => {
    let filtered = data;
    if (searchValue) {
      const lowerSearch = searchValue.toLowerCase();
      filtered = filtered.filter((item: ReportMetadata) => item.reportName.toLowerCase().includes(lowerSearch));
    }

    if (!filtered.length) return [];
    return [...filtered].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      const key = sortConfig.key as keyof ReportMetadata;
      if (key === 'generatedAt' || key === 'periodStart') {
        aVal = new Date(a[key] as string).getTime();
        bVal = new Date(b[key] as string).getTime();
      } else {
        const valA = a[key];
        const valB = b[key];
        aVal = typeof valA === 'string' || typeof valA === 'number' ? valA : '';
        bVal = typeof valB === 'string' || typeof valB === 'number' ? valB : '';
      }

      if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, searchValue]);

  return (
    <div className="report-table__page-container">
      <div className="report-table__page-header">
        <h1 className="report-table__page-title">{t('reports.title')}</h1>
        <p className="report-table__page-subtitle">{t('reports.subtitle')}</p>
      </div>

      <Card className="report-table__filters-card">
        <div className="report-table__filters-row">
          <DateRangePicker
            label={t('reports.period')}
            startDate={localFilters.startDate ?? ''}
            endDate={localFilters.endDate ?? ''}
            onStartDateChange={(val) => setLocalFilters((prev) => ({ ...prev, startDate: val || undefined }))}
            onEndDateChange={(val) => setLocalFilters((prev) => ({ ...prev, endDate: val || undefined }))}
          />
          <Select
            label={t('reports.reportType')}
            options={REPORT_TYPE_OPTIONS.map((opt) => ({ ...opt, label: t(opt.label) }))}
            value={localFilters.reportType || ''}
            onChange={(val) =>
              setLocalFilters((prev) => ({
                ...prev,
                reportType: (val as ReportFilters['reportType']) || undefined,
              }))
            }
          />
        </div>

        <div className="report-table__filters-actions">
          <Button variant="secondary" onClick={handleResetFilters}>
            {t('reports.clearFilters')}
          </Button>
          <Button variant="primary" icon={<Filter size={16} />} onClick={handleApplyFilters}>
            {t('reports.applyFilters')}
          </Button>
        </div>
      </Card>

      <Card
        title={t('reports.generated')}
        subtitle={`${totalItems} ${t('reports.title').toLowerCase()}`}
        headerAction={
          <div className="report-table__header-actions">
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCcw size={16} />}
              onClick={fetchReports}
              aria-label={t('reports.refresh')}
            >
              {t('reports.refresh')}
            </Button>
            <Input
              placeholder={t('reports.search')}
              icon={<Search size={16} />}
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              className="report-table__search"
            />
          </div>
        }
        noPadding
      >
        <Table
          columns={columns}
          data={sortedData}
          loading={loading}
          sortField={sortConfig.key}
          sortOrder={sortConfig.order}
          onSort={handleSort}
          emptyMessage={t('reports.empty')}
          emptyDescription={t('reports.emptyDesc')}
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
      
      <SendReportEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        filename={selectedReportForEmail}
        addToast={addToast}
      />
      
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
