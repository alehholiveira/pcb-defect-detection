import { useState } from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { DateRangePicker } from '../../components/DateRangePicker';
import './ReportFilters.css';

const REPORT_TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
];

const MODEL_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'yolo11', label: 'YOLOv11' },
  { value: 'faster_rcnn', label: 'Faster R-CNN' },
  { value: 'retinanet', label: 'RetinaNet' },
  { value: 'rt_detr', label: 'RT-DETR' },
];

const DEFECT_TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'missing_hole', label: 'Missing Hole' },
  { value: 'mouse_bite', label: 'Mouse Bite' },
  { value: 'open_circuit', label: 'Open Circuit' },
  { value: 'short', label: 'Short' },
  { value: 'spur', label: 'Spur' },
  { value: 'spurious_copper', label: 'Spurious Copper' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'completed', label: 'Concluído' },
  { value: 'pending', label: 'Pendente' },
  { value: 'failed', label: 'Falhou' },
];

export function ReportFilters() {
  const { t } = useTranslation();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('');
  const [model, setModel] = useState('');
  const [defectType, setDefectType] = useState('');
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setReportType('');
    setModel('');
    setDefectType('');
    setStatus('');
    // TODO: connect to backend — trigger a reset/refetch
  };

  const handleApplyFilters = () => {
    // TODO: connect to backend — send filter state to API query
    console.log('Applying filters:', {
      startDate,
      endDate,
      reportType,
      model,
      defectType,
      status,
    });
  };

  return (
    <Card className="report-filters">
      <div className="report-filters__row">
        <DateRangePicker
          label={t('reports.period')}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
        <Select
          label={t('reports.reportType')}
          options={REPORT_TYPE_OPTIONS}
          value={reportType}
          onChange={setReportType}
        />
        <Select
          label={t('reports.model')}
          options={MODEL_OPTIONS}
          value={model}
          onChange={setModel}
        />
      </div>

      {expanded && (
        <div className="report-filters__extra">
          <Select
            label={t('reports.defectType')}
            options={DEFECT_TYPE_OPTIONS}
            value={defectType}
            onChange={setDefectType}
          />
          <Select
            label={t('reports.statusFilter')}
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
          />
        </div>
      )}

      <div className="report-filters__actions">
        <Button variant="secondary" onClick={handleClearFilters}>
          {t('reports.clearFilters')}
        </Button>
        <Button
          variant="primary"
          icon={<Filter size={16} />}
          onClick={handleApplyFilters}
        >
          {t('reports.applyFilters')}
        </Button>
      </div>

      <button
        type="button"
        className="report-filters__expand"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {t('reports.expandFilters')}
        <span
          className={`report-filters__expand-icon ${expanded ? 'report-filters__expand-icon--open' : ''}`}
        >
          <ChevronDown size={16} />
        </span>
      </button>
    </Card>
  );
}
