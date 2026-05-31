import { useState, useMemo } from 'react';
import { Plus, Eye, Download, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { Table } from '../../components/Table';
import { Pagination } from '../../components/Pagination';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import type { DefectClass } from '../../types/inference';
import './ReportTable.css';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DefectsByType {
  missing_hole: number;
  mouse_bite: number;
  open_circuit: number;
  short: number;
  spur: number;
  spurious_copper: number;
}

interface ReportRow {
  id: number;
  name: string;
  filename: string;
  date: string;
  period: string;
  model: string;
  modelKey: string;
  inspections: number;
  defects: number;
  defectsByType: DefectsByType;
  generatedBy: string;
  status: 'completed' | 'pending' | 'failed';
}

/* ------------------------------------------------------------------ */
/*  Defect-type label / color mapping                                  */
/* ------------------------------------------------------------------ */

const DEFECT_LABELS: Record<DefectClass, string> = {
  missing_hole: 'MH',
  mouse_bite: 'MB',
  open_circuit: 'OC',
  short: 'SH',
  spur: 'SP',
  spurious_copper: 'SC',
};

/* ------------------------------------------------------------------ */
/*  Mock data (10 rows)                                                */
/* ------------------------------------------------------------------ */

const MOCK_REPORTS: ReportRow[] = [
  {
    id: 1,
    name: 'Relatório Semanal - Semana 21',
    filename: 'relatorio_semanal_2026_05_21.pdf',
    date: '28/05/2026 08:00',
    period: '19/05/2026 - 25/05/2026',
    model: 'YOLOv11',
    modelKey: 'yolo11',
    inspections: 152,
    defects: 38,
    defectsByType: { missing_hole: 12, mouse_bite: 8, open_circuit: 10, short: 6, spur: 0, spurious_copper: 2 },
    generatedBy: 'Sistema (Automático)',
    status: 'completed',
  },
  {
    id: 2,
    name: 'Relatório Diário - 27/05',
    filename: 'relatorio_diario_2026_05_27.pdf',
    date: '27/05/2026 23:59',
    period: '27/05/2026',
    model: 'Faster R-CNN',
    modelKey: 'faster_rcnn',
    inspections: 24,
    defects: 7,
    defectsByType: { missing_hole: 2, mouse_bite: 1, open_circuit: 3, short: 0, spur: 1, spurious_copper: 0 },
    generatedBy: 'Sistema (Automático)',
    status: 'completed',
  },
  {
    id: 3,
    name: 'Relatório Semanal - Semana 20',
    filename: 'relatorio_semanal_2026_05_14.pdf',
    date: '21/05/2026 08:00',
    period: '12/05/2026 - 18/05/2026',
    model: 'YOLOv11',
    modelKey: 'yolo11',
    inspections: 198,
    defects: 45,
    defectsByType: { missing_hole: 15, mouse_bite: 10, open_circuit: 8, short: 7, spur: 3, spurious_copper: 2 },
    generatedBy: 'Sistema (Automático)',
    status: 'completed',
  },
  {
    id: 4,
    name: 'Relatório Diário - 26/05',
    filename: 'relatorio_diario_2026_05_26.pdf',
    date: '26/05/2026 23:59',
    period: '26/05/2026',
    model: 'RetinaNet',
    modelKey: 'retinanet',
    inspections: 18,
    defects: 5,
    defectsByType: { missing_hole: 1, mouse_bite: 0, open_circuit: 2, short: 1, spur: 0, spurious_copper: 1 },
    generatedBy: 'Sistema (Automático)',
    status: 'completed',
  },
  {
    id: 5,
    name: 'Relatório Mensal - Abril 2026',
    filename: 'relatorio_mensal_2026_04.pdf',
    date: '01/05/2026 08:00',
    period: '01/04/2026 - 30/04/2026',
    model: 'YOLOv11',
    modelKey: 'yolo11',
    inspections: 620,
    defects: 134,
    defectsByType: { missing_hole: 42, mouse_bite: 28, open_circuit: 30, short: 18, spur: 8, spurious_copper: 8 },
    generatedBy: 'Sistema (Automático)',
    status: 'completed',
  },
  {
    id: 6,
    name: 'Relatório Diário - 25/05',
    filename: 'relatorio_diario_2026_05_25.pdf',
    date: '25/05/2026 23:59',
    period: '25/05/2026',
    model: 'RT-DETR',
    modelKey: 'rt_detr',
    inspections: 30,
    defects: 11,
    defectsByType: { missing_hole: 3, mouse_bite: 2, open_circuit: 2, short: 2, spur: 1, spurious_copper: 1 },
    generatedBy: 'Carlos Silva',
    status: 'completed',
  },
  {
    id: 7,
    name: 'Relatório Semanal - Semana 19',
    filename: 'relatorio_semanal_2026_05_07.pdf',
    date: '14/05/2026 08:00',
    period: '05/05/2026 - 11/05/2026',
    model: 'Faster R-CNN',
    modelKey: 'faster_rcnn',
    inspections: 175,
    defects: 52,
    defectsByType: { missing_hole: 18, mouse_bite: 12, open_circuit: 9, short: 8, spur: 3, spurious_copper: 2 },
    generatedBy: 'Sistema (Automático)',
    status: 'completed',
  },
  {
    id: 8,
    name: 'Relatório Diário - 30/05',
    filename: 'relatorio_diario_2026_05_30.pdf',
    date: '30/05/2026 23:59',
    period: '30/05/2026',
    model: 'YOLOv11',
    modelKey: 'yolo11',
    inspections: 22,
    defects: 6,
    defectsByType: { missing_hole: 2, mouse_bite: 1, open_circuit: 1, short: 1, spur: 0, spurious_copper: 1 },
    generatedBy: 'Sistema (Automático)',
    status: 'pending',
  },
  {
    id: 9,
    name: 'Relatório Semanal - Semana 22',
    filename: 'relatorio_semanal_2026_05_28.pdf',
    date: '31/05/2026 08:00',
    period: '26/05/2026 - 01/06/2026',
    model: 'RetinaNet',
    modelKey: 'retinanet',
    inspections: 0,
    defects: 0,
    defectsByType: { missing_hole: 0, mouse_bite: 0, open_circuit: 0, short: 0, spur: 0, spurious_copper: 0 },
    generatedBy: 'Sistema (Automático)',
    status: 'failed',
  },
  {
    id: 10,
    name: 'Relatório Mensal - Março 2026',
    filename: 'relatorio_mensal_2026_03.pdf',
    date: '01/04/2026 08:00',
    period: '01/03/2026 - 31/03/2026',
    model: 'RT-DETR',
    modelKey: 'rt_detr',
    inspections: 580,
    defects: 120,
    defectsByType: { missing_hole: 38, mouse_bite: 22, open_circuit: 28, short: 16, spur: 10, spurious_copper: 6 },
    generatedBy: 'Ana Souza',
    status: 'completed',
  },
];

/* ------------------------------------------------------------------ */
/*  Helper renderers                                                   */
/* ------------------------------------------------------------------ */

function renderDefectsByType(defectsByType: DefectsByType) {
  const entries = (Object.entries(defectsByType) as [DefectClass, number][]).filter(
    ([, count]) => count > 0,
  );

  if (entries.length === 0) {
    return <span className="report-table__name-secondary">—</span>;
  }

  return (
    <span className="report-table__defects-by-type">
      {entries.map(([type, count]) => (
        <span key={type} className="report-table__defect-dot" title={type}>
          <span className={`report-table__defect-dot-circle report-table__defect-dot-circle--${type}`} />
          {DEFECT_LABELS[type]}: {count}
        </span>
      ))}
    </span>
  );
}

function statusVariant(status: ReportRow['status']) {
  switch (status) {
    case 'completed':
      return 'success' as const;
    case 'pending':
      return 'warning' as const;
    case 'failed':
      return 'danger' as const;
  }
}

function statusLabel(status: ReportRow['status'], t: (key: string) => string) {
  switch (status) {
    case 'completed':
      return t('reports.completed');
    case 'pending':
      return t('inferences.pending');
    case 'failed':
      return t('inferences.failed');
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ITEMS_PER_PAGE = 5;

export function ReportTable() {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

  // TODO: replace mock data with API call when backend is ready
  const data = MOCK_REPORTS;
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedData = useMemo(
    () => data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [data, currentPage, itemsPerPage],
  );

  const handleViewReport = (_report: ReportRow) => {
    // TODO: implement when backend is ready — open report detail / preview
  };

  const handleDownloadReport = (_report: ReportRow) => {
    // TODO: implement when backend is ready — trigger file download
  };

  const handleMoreActions = (_report: ReportRow) => {
    // TODO: implement when backend is ready — show context menu (delete, share, etc.)
  };

  const handleGenerateManual = () => {
    // TODO: implement when backend is ready — open manual generation modal
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const columns = [
    {
      key: 'name',
      label: t('reports.reportName'),
      width: '220px',
      render: (_: unknown, row: ReportRow) => (
        <div className="report-table__name-cell">
          <span className="report-table__name-primary">{row.name}</span>
          <span className="report-table__name-secondary">{row.filename}</span>
        </div>
      ),
    },
    {
      key: 'date',
      label: t('reports.generationDate'),
      sortable: true,
      width: '150px',
    },
    {
      key: 'period',
      label: t('reports.referencePeriod'),
      width: '180px',
    },
    {
      key: 'model',
      label: t('reports.model'),
      width: '130px',
      render: (_: unknown, row: ReportRow) => (
        <span className="report-table__model-cell">
          <span className={`report-table__model-dot report-table__model-dot--${row.modelKey}`} />
          {row.model}
        </span>
      ),
    },
    {
      key: 'inspections',
      label: t('reports.inspections'),
      sortable: true,
      width: '100px',
    },
    {
      key: 'defects',
      label: t('reports.detectedDefects'),
      sortable: true,
      width: '120px',
      render: (value: number) => (
        <span className="report-table__defects-count">{value}</span>
      ),
    },
    {
      key: 'defectsByType',
      label: t('reports.defectsByType'),
      width: '200px',
      render: (value: DefectsByType) => renderDefectsByType(value),
    },
    {
      key: 'generatedBy',
      label: t('reports.generatedBy'),
      width: '150px',
    },
    {
      key: 'status',
      label: t('reports.status'),
      width: '110px',
      render: (_: unknown, row: ReportRow) => (
        <Badge variant={statusVariant(row.status)} dot>
          {statusLabel(row.status, t)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: t('reports.actions'),
      width: '110px',
      render: (_: unknown, row: ReportRow) => (
        <span className="report-table__actions">
          <button
            type="button"
            className="report-table__action-btn"
            title={t('common.view')}
            onClick={() => handleViewReport(row)}
          >
            <Eye size={16} />
          </button>
          <button
            type="button"
            className="report-table__action-btn"
            title={t('common.download')}
            onClick={() => handleDownloadReport(row)}
          >
            <Download size={16} />
          </button>
          <button
            type="button"
            className="report-table__action-btn"
            onClick={() => handleMoreActions(row)}
          >
            <MoreVertical size={16} />
          </button>
        </span>
      ),
    },
  ];

  return (
    <Card
      title={t('reports.generated')}
      subtitle={`${totalItems} ${t('reports.title').toLowerCase()}`}
      headerAction={
        <Button
          variant="secondary"
          icon={<Plus size={16} />}
          onClick={handleGenerateManual}
        >
          {t('reports.generateManual')}
        </Button>
      }
      noPadding
    >
      <Table columns={columns} data={paginatedData} />

      <div className="report-table__pagination-wrapper">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>
    </Card>
  );
}
