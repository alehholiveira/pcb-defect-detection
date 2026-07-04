import { useTranslation } from 'react-i18next';
import { Filter, X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../../components/Button';
import { Select } from '../../components/Select';
import { DateRangePicker } from '../../components/DateRangePicker';
import { AVAILABLE_MODELS } from '../../types/inference';
import type { MetricsFilters as FilterTypes } from '../../types/metrics';
import './MetricsFilters.css';

interface MetricsFiltersProps {
  filters: FilterTypes;
  onUpdateFilters: (filters: Partial<FilterTypes>) => void;
  onClearFilters: () => void;
}

export function MetricsFilters({ filters, onUpdateFilters, onClearFilters }: MetricsFiltersProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [draftFilters, setDraftFilters] = useState<FilterTypes>(filters);

  // Sync local draft when external filters change (e.g., when cleared)
  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const activeFiltersCount = [
    filters.startDate,
    filters.endDate,
    filters.modelName,
  ].filter(Boolean).length;

  const modelOptions = [
    { value: '', label: t('metrics.filters.allModels', 'All Models') },
    ...AVAILABLE_MODELS.map(m => ({ value: m.value, label: m.label }))
  ];

  const granularityOptions = [
    { value: 'daily', label: t('metrics.filters.daily', 'Daily') },
    { value: 'weekly', label: t('metrics.filters.weekly', 'Weekly') },
    { value: 'monthly', label: t('metrics.filters.monthly', 'Monthly') },
  ];

  const handleApply = () => {
    onUpdateFilters(draftFilters);
  };

  const handleClear = () => {
    onClearFilters();
    setIsExpanded(false);
  };

  return (
    <div className="metrics-filters">
      <div className="metrics-filters__header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="metrics-filters__title">
          <Filter size={18} />
          <span>{t('metrics.filters.title', 'Filters')}</span>
          {activeFiltersCount > 0 && (
            <span className="metrics-filters__badge">{activeFiltersCount}</span>
          )}
        </div>
        <button className="metrics-filters__toggle" aria-label="Toggle filters">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {isExpanded && (
        <div className="metrics-filters__body">
          <div className="metrics-filters__grid">
            <div className="metrics-filters__field">
              <label>{t('metrics.filters.period', 'Period')}</label>
              <DateRangePicker
                startDate={draftFilters.startDate || ''}
                endDate={draftFilters.endDate || ''}
                onStartDateChange={(start) => setDraftFilters(prev => ({ ...prev, startDate: start || undefined }))}
                onEndDateChange={(end) => setDraftFilters(prev => ({ ...prev, endDate: end || undefined }))}
              />
            </div>

            <div className="metrics-filters__field">
              <label>{t('metrics.filters.granularity', 'Granularity')}</label>
              <Select
                value={draftFilters.granularity || 'daily'}
                onChange={(val) => setDraftFilters(prev => ({ ...prev, granularity: val as any }))}
                options={granularityOptions}
              />
            </div>

            <div className="metrics-filters__field">
              <label>{t('metrics.filters.model', 'Model')}</label>
              <Select
                value={draftFilters.modelName || ''}
                onChange={(val) => setDraftFilters(prev => ({ ...prev, modelName: val || undefined }))}
                options={modelOptions}
              />
            </div>
          </div>

          <div className="metrics-filters__actions">
            <Button
              variant="secondary"
              onClick={handleClear}
              disabled={activeFiltersCount === 0}
              icon={<X size={16} />}
            >
              {t('metrics.filters.clear', 'Clear Filters')}
            </Button>
            <Button
              variant="primary"
              onClick={handleApply}
              icon={<Search size={16} />}
              className="metrics-filters__apply"
            >
              {t('metrics.filters.apply', 'Apply')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
