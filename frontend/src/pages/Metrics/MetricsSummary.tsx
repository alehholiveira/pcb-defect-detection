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
        label={t('metrics.summary.totalInferences', 'Total Inferences')}
        value={summary.totalInferences.toLocaleString()}
        color="blue"
      />
      <StatCard
        icon={<ImageIcon size={24} />}
        label={t('metrics.summary.totalImages', 'Total Images')}
        value={summary.totalImages.toLocaleString()}
        color="green"
      />
      <StatCard
        icon={<AlertTriangle size={24} />}
        label={t('metrics.summary.totalDefects', 'Total Defects')}
        value={summary.totalDefects.toLocaleString()}
        color="red"
      />
      <StatCard
        icon={<Target size={24} />}
        label={t('metrics.summary.avgConfidence', 'Avg. Confidence')}
        value={`${(summary.avgConfidence * 100).toFixed(1)}%`}
        color="orange"
      />
      <StatCard
        icon={<Clock size={24} />}
        label={t('metrics.summary.avgTime', 'Avg. Time')}
        value={`${(summary.avgInferenceTimeMs / 1000).toFixed(2)}s`}
        color="gray"
      />
      <StatCard
        icon={<TrendingUp size={24} />}
        label={t('metrics.summary.defectRate', 'Defect Rate')}
        value={summary.defectRate.toFixed(2)}
        subtitle={t('metrics.summary.perImage', 'per image')}
        color="red"
      />
    </div>
  );
}
