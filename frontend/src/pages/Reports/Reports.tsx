import { useTranslation } from 'react-i18next';
import { ReportFilters } from './ReportFilters';
import { ReportTable } from './ReportTable';
import './Reports.css';

export function Reports() {
  const { t } = useTranslation();

  return (
    <div className="reports-page">
      <div className="reports-page__header">
        <h1 className="reports-page__title">{t('reports.title')}</h1>
        <p className="reports-page__subtitle">{t('reports.subtitle')}</p>
      </div>

      <ReportFilters />
      <ReportTable />
    </div>
  );
}
