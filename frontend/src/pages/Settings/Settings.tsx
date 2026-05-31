import { Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../Metrics/Metrics.css';

export function Settings() {
  const { t } = useTranslation();

  return (
    <div className="placeholder-page">
      <div className="placeholder-card">
        <Settings2 size={64} strokeWidth={1.2} />
        <h2>{t('placeholders.comingSoon')}</h2>
        <p>{t('placeholders.settingsDescription')}</p>
      </div>
    </div>
  );
}
