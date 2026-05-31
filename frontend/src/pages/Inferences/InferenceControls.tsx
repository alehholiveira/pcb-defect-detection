import { useTranslation } from 'react-i18next'
import { Play } from 'lucide-react'
import { Card } from '../../components/Card'
import { Select } from '../../components/Select'
import { DropZone } from '../../components/DropZone'
import { AVAILABLE_MODELS } from '../../types/inference'
import './InferenceControls.css'

interface InferenceControlsProps {
  selectedModel: string
  onModelChange: (model: string) => void
  onFilesSelected: (files: File[]) => void
  onRunInference: () => void
  fileCount: number
  isLoading: boolean
}

export function InferenceControls({
  selectedModel,
  onModelChange,
  onFilesSelected,
  onRunInference,
  fileCount,
  isLoading,
}: InferenceControlsProps) {
  const { t } = useTranslation()

  const modelOptions = AVAILABLE_MODELS.map((m) => ({
    value: m.value,
    label: m.label,
  }))

  return (
    <Card>
      <div className="inference-controls">
        <div className="inference-controls__model">
          <Select
            label={t('inference.controls.model', 'Modelo de Detecção')}
            options={modelOptions}
            value={selectedModel}
            onChange={onModelChange}
            placeholder={t(
              'inference.controls.selectModel',
              'Selecionar modelo...'
            )}
          />
        </div>

        <div className="inference-controls__dropzone">
          <DropZone
            onFilesSelected={onFilesSelected}
            accept="image/jpeg,image/png,image/bmp"
            multiple
            maxSize={10 * 1024 * 1024}
            maxFiles={20}
          />
        </div>

        <div className="inference-controls__action">
          <button
            className="inference-controls__run-btn"
            onClick={onRunInference}
            disabled={fileCount === 0 || isLoading}
          >
            <Play />
            {t('inference.controls.run', 'Executar Inferência')}
          </button>
          {fileCount > 0 && (
            <span className="inference-controls__file-count">
              {t('inference.controls.fileCount', '{{count}} imagem(ns) selecionada(s)', {
                count: fileCount,
              })}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
