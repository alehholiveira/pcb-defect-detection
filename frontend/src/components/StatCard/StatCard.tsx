import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import './StatCard.css';

type StatColor = 'green' | 'red' | 'blue' | 'orange' | 'gray';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: StatColor;
}

const COLOR_MAP: Record<StatColor, { fg: string; bg: string }> = {
  green: { fg: '#16A34A', bg: '#DCFCE7' },
  red: { fg: '#DC2626', bg: '#FEE2E2' },
  blue: { fg: '#3B82F6', bg: '#DBEAFE' },
  orange: { fg: '#F59E0B', bg: '#FEF3C7' },
  gray: { fg: '#6B7280', bg: '#F3F4F6' },
};

export function StatCard({
  icon,
  label,
  value,
  subtitle,
  color = 'green',
}: StatCardProps) {
  const { t } = useTranslation();
  const { fg, bg } = COLOR_MAP[color];

  return (
    <div className="stat-card" role="group" aria-label={t('statCard.group', { label })}>
      <div
        className="stat-card__icon"
        style={{ backgroundColor: bg, color: fg }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="stat-card__content">
        <span className="stat-card__value">{value}</span>
        <span className="stat-card__label">{label}</span>
        {subtitle && (
          <span className="stat-card__subtitle">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
