import { BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Metrics.css';

export function Metrics() {
  const { t } = useTranslation();

  return (
    <div className="placeholder-page">
      <div className="placeholder-card">
        <BarChart3 size={64} strokeWidth={1.2} />
        <h2>{t('placeholders.comingSoon')}</h2>
        <p>{t('placeholders.metricsDescription')}</p>
      </div>
    </div>
  );
}
