import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useMetrics } from '../../hooks/useMetrics';
import { MetricsFilters } from './MetricsFilters';
import { MetricsSummary } from './MetricsSummary';
import { MetricsCharts } from './MetricsCharts';
import './Metrics.css';

export function Metrics() {
  const { t } = useTranslation();
  const { metrics, loading, error, filters, updateFilters, clearFilters } = useMetrics();

  return (
    <div className="metrics-page">
      <div className="metrics-page__header">
        <div>
          <h1 className="metrics-page__title">{t('metrics.page.title')}</h1>
          <p className="metrics-page__subtitle">
            {t('metrics.page.subtitle')}
          </p>
        </div>
      </div>

      <MetricsFilters
        filters={filters}
        onUpdateFilters={updateFilters}
        onClearFilters={clearFilters}
      />

      {error && (
        <div className="metrics-page__error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && !metrics && (
        <div className="metrics-page__loading">
          <Loader2 size={32} className="animate-spin" />
          <p>{t('metrics.loading')}</p>
        </div>
      )}

      {!loading && !error && metrics && (
        <>
          <MetricsSummary summary={metrics.summary} />
          <MetricsCharts metrics={metrics} />
        </>
      )}
    </div>
  );
}
