import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { useInference } from '../../hooks/useInference'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'
import { InferenceControls } from './InferenceControls'
import { ImagePreview } from './ImagePreview'
import { InferenceLoading } from './InferenceLoading'
import { InferenceResults } from './InferenceResults'
import { ResultSummary } from './ResultSummary'
import { InferenceHistory } from './InferenceHistory'
import './Inferences.css'

export function Inferences() {
  const { t } = useTranslation()
  const { toasts, addToast, removeToast } = useToast()

  const {
    selectedModel,
    selectedFiles,
    filePreviews,
    resultPreviews,
    isLoading,
    predictionResult,
    currentResultIndex,
    historyData,
    historyFilters,
    historyLoading,
    error,
    setModel,
    addFiles,
    removeFile,
    runInferenceAction,
    loadInferenceAction,
    clearResults,
    clearFiles,
    setHistoryFilters,
    fetchHistory,
    setCurrentResultIndex,
  } = useInference()

  const handleRunInference = useCallback(async () => {
    const result = await runInferenceAction()
    if (result) {
      addToast(
        t('toast.inferenceSuccess', { detections: result.total_detections }),
        'success'
      )
    } else {
      addToast(t('toast.inferenceFailed'), 'error')
    }
  }, [runInferenceAction, addToast, t])

  return (
    <div className="inferences-page">
      <div className="inferences-page__header">
        <div>
          <h1 className="inferences-page__title">
            {t('inference.page.title')}
          </h1>
          <p className="inferences-page__subtitle">
            {t('inference.page.subtitle')}
          </p>
        </div>
      </div>

      {error && (
        <div className="inferences-page__error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <InferenceControls
        selectedModel={selectedModel}
        onModelChange={setModel}
        onFilesSelected={addFiles}
        onRunInference={handleRunInference}
        onClearFiles={clearFiles}
        fileCount={selectedFiles.length}
        isLoading={isLoading}
      />

      {filePreviews.length > 0 && !predictionResult && (
        <ImagePreview
          filePreviews={filePreviews}
          onRemoveFile={removeFile}
          onClearAll={clearResults}
        />
      )}

      <InferenceLoading isLoading={isLoading} />

      {predictionResult && (
        <>
          <ResultSummary predictionResult={predictionResult} />

          <InferenceResults
            predictionResult={predictionResult}
            filePreviews={resultPreviews}
            currentIndex={currentResultIndex}
            onIndexChange={setCurrentResultIndex}
          />
        </>
      )}

      <InferenceHistory
        historyData={historyData}
        historyFilters={historyFilters}
        historyLoading={historyLoading}
        onFiltersChange={setHistoryFilters}
        onFetchHistory={fetchHistory}
        onReplayInference={loadInferenceAction}
      />

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}
