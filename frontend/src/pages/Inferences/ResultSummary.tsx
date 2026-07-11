import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Images, AlertTriangle, TrendingUp, Cpu, Clock } from 'lucide-react'
import { StatCard } from '../../components/StatCard'
import type { PredictionResponse } from '../../types/inference'
import './ResultSummary.css'

interface ResultSummaryProps {
  predictionResult: PredictionResponse
}

export function ResultSummary({ predictionResult }: ResultSummaryProps) {
  const { t } = useTranslation()

  const stats = useMemo(() => {
    const totalImages = predictionResult.images.length
    const totalDefects = predictionResult.total_detections

    const allConfidences = predictionResult.images.flatMap((img) =>
      img.detections.map((d) => d.confidence)
    )
    const avgConfidence =
      allConfidences.length > 0
        ? allConfidences.reduce((sum, c) => sum + c, 0) / allConfidences.length
        : 0

    const modelName = predictionResult.model_name
    const executionTime = (predictionResult.inference_time_ms / 1000).toFixed(2)

    return { totalImages, totalDefects, avgConfidence, modelName, executionTime }
  }, [predictionResult])

  return (
    <div className="result-summary">
      <StatCard
        icon={<Images size={20} />}
        label={t('inference.summary.imagesProcessed')}
        value={stats.totalImages}
        color="green"
      />
      <StatCard
        icon={<AlertTriangle size={20} />}
        label={t('inference.summary.detectedDefects')}
        value={stats.totalDefects}
        color="red"
      />
      <StatCard
        icon={<TrendingUp size={20} />}
        label={t('inference.summary.avgConfidence')}
        value={`${(stats.avgConfidence * 100).toFixed(1)}%`}
        color="blue"
      />
      <StatCard
        icon={<Cpu size={20} />}
        label={t('inference.summary.modelUsed')}
        value={stats.modelName}
        color="gray"
      />
      <StatCard
        icon={<Clock size={20} />}
        label={t('inference.summary.executionTime')}
        value={`${stats.executionTime}s`}
        color="orange"
      />
    </div>
  )
}
