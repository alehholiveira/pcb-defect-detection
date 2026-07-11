import { useTranslation } from 'react-i18next'
import { Cpu } from 'lucide-react'
import './InferenceLoading.css'

interface InferenceLoadingProps {
  isLoading: boolean
}

export function InferenceLoading({ isLoading }: InferenceLoadingProps) {
  const { t } = useTranslation()

  if (!isLoading) return null

  return (
    <div className="inference-loading-overlay">
      <div className="inference-loading__card">
        <div className="inference-loading__icon-wrapper">
          <Cpu className="inference-loading__icon" />
          <div className="inference-loading__ring" />
        </div>
        <h3 className="inference-loading__title">
          {t('inference.loading.title')}
        </h3>
        <p className="inference-loading__description">
          {t('inference.loading.description')}
        </p>
        <div className="inference-loading__progress">
          <div className="inference-loading__dots">
            <span className="inference-loading__dot" />
            <span className="inference-loading__dot" />
            <span className="inference-loading__dot" />
          </div>
        </div>
      </div>
    </div>
  )
}
