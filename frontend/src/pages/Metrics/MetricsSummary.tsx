import { useTranslation } from 'react-i18next';
import { Cpu, Image as ImageIcon, AlertTriangle, Target, Clock, TrendingUp } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import type { MetricsSummary as SummaryType } from '../../types/metrics';
import './MetricsSummary.css';

interface MetricsSummaryProps {
  summary: SummaryType;
}

export function MetricsSummary({ summary }: MetricsSummaryProps) {
  const { t } = useTranslation();

  return (
    <div className="metrics-summary">
      <StatCard
        icon={<Cpu size={24} />}
        label={t('metrics.summary.totalInferences')}
        value={summary.totalInferences.toLocaleString()}
        color="blue"
      />
      <StatCard
        icon={<ImageIcon size={24} />}
        label={t('metrics.summary.totalImages')}
        value={summary.totalImages.toLocaleString()}
        color="green"
      />
      <StatCard
        icon={<AlertTriangle size={24} />}
        label={t('metrics.summary.totalDefects')}
        value={summary.totalDefects.toLocaleString()}
        color="red"
      />
      <StatCard
        icon={<Target size={24} />}
        label={t('metrics.summary.avgConfidence')}
        value={`${(summary.avgConfidence * 100).toFixed(1)}%`}
        color="orange"
      />
      <StatCard
        icon={<Clock size={24} />}
        label={t('metrics.summary.avgTime')}
        value={`${(summary.avgInferenceTimeMs / 1000).toFixed(2)}s`}
        color="gray"
      />
      <StatCard
        icon={<TrendingUp size={24} />}
        label={t('metrics.summary.defectRate')}
        value={summary.defectRate.toFixed(2)}
        subtitle={t('metrics.summary.perImage')}
        color="red"
      />
    </div>
  );
}
