import { useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import type { PredictionResponse, Detection } from '../../types/inference'
import type { FilePreview } from '../../hooks/useInference'
import './InferenceResults.css'

const DEFECT_COLOR_MAP: Record<string, string> = {
  missing_hole: '#EF4444',
  mouse_bite: '#F97316',
  open_circuit: '#EAB308',
  short: '#22C55E',
  spur: '#3B82F6',
  spurious_copper: '#8B5CF6',
}

const DEFECT_LABEL_MAP: Record<string, string> = {
  missing_hole: 'Missing Hole',
  mouse_bite: 'Mouse Bite',
  open_circuit: 'Open Circuit',
  short: 'Short',
  spur: 'Spur',
  spurious_copper: 'Spurious Copper',
}

interface InferenceResultsProps {
  predictionResult: PredictionResponse
  filePreviews: FilePreview[]
  currentIndex: number
  onIndexChange: (index: number) => void
}

function drawDetections(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  detections: Detection[],
  t: any
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight

  ctx.drawImage(img, 0, 0)

  // The model API returns bounding box coordinates in absolute pixel values (x1, y1, x2, y2)
  // relative to the original image dimensions.
  // Because we draw the image onto the canvas at its natural (original) resolution,
  // we do not need to apply any scaling transformations here. The CSS handles scaling
  // the canvas down to fit the viewport, maintaining the correct aspect ratio.
  for (const det of detections) {
    const color = DEFECT_COLOR_MAP[det.class_name] ?? '#9CA3AF'
    const x = det.x1
    const y = det.y1
    const w = det.x2 - det.x1
    const h = det.y2 - det.y1

    // Bounding box
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(2, Math.round(img.naturalWidth / 300))
    ctx.strokeRect(x, y, w, h)

    // Label background
    const defectLabel = t(`defects.${det.class_name}`, DEFECT_LABEL_MAP[det.class_name] ?? det.class_name)
    const label = `${defectLabel} ${(det.confidence * 100).toFixed(0)}%`
    const fontSize = Math.max(12, Math.round(img.naturalWidth / 50))
    ctx.font = `bold ${fontSize}px sans-serif`
    const textMetrics = ctx.measureText(label)
    const labelPadding = 4
    const labelHeight = fontSize + labelPadding * 2
    const labelWidth = textMetrics.width + labelPadding * 2

    const labelY = y - labelHeight > 0 ? y - labelHeight : y
    ctx.fillStyle = color
    ctx.fillRect(x, labelY, labelWidth, labelHeight)

    // Label text
    ctx.fillStyle = '#FFFFFF'
    ctx.textBaseline = 'top'
    ctx.fillText(label, x + labelPadding, labelY + labelPadding)
  }
}

function buildDetectionSummary(detections: Detection[]) {
  const counts: Record<string, number> = {}
  for (const det of detections) {
    counts[det.class_name] = (counts[det.class_name] ?? 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

export function InferenceResults({
  predictionResult,
  filePreviews,
  currentIndex,
  onIndexChange,
}: InferenceResultsProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const images = predictionResult.images
  const currentImage = images[currentIndex]
  const total = images.length
  const totalTime = (predictionResult.inference_time_ms / 1000).toFixed(2)

  // Find the matching file preview for the current image
  const currentPreview = useMemo(() => {
    if (!currentImage) return null
    const match = filePreviews.find((fp) => fp.name === currentImage.image_name)
    return match ?? filePreviews[currentIndex] ?? null
  }, [currentImage, filePreviews, currentIndex])

  const detectionSummary = useMemo(
    () => (currentImage ? buildDetectionSummary(currentImage.detections) : []),
    [currentImage]
  )

  const totalDetections = currentImage?.detections.length ?? 0

  const handleImageLoad = useCallback(() => {
    if (!canvasRef.current || !imgRef.current || !currentImage) return
    drawDetections(canvasRef.current, imgRef.current, currentImage.detections, t)
  }, [currentImage, t])

  // Redraw when index changes
  useEffect(() => {
    if (imgRef.current?.complete && canvasRef.current && currentImage) {
      drawDetections(canvasRef.current, imgRef.current, currentImage.detections, t)
    }
  }, [currentIndex, currentImage, t])

  const handlePrev = () => {
    onIndexChange(currentIndex > 0 ? currentIndex - 1 : total - 1)
  }

  const handleNext = () => {
    onIndexChange(currentIndex < total - 1 ? currentIndex + 1 : 0)
  }

  if (!currentImage || !currentPreview) return null

  return (
    <div className="inference-results">
      <div className="inference-results__header">
        <div className="inference-results__header-left">
          <h2 className="inference-results__title">
            {t('inference.results.title')}
          </h2>
          <Badge variant="success" dot>
            {t('inference.results.completed')}
          </Badge>
        </div>
        <span className="inference-results__processed">
          {t('inference.results.processed', {
            total: total,
            time: totalTime
          })}
        </span>
      </div>

      <Card className="inference-results__card">
        <div className="inference-results__grid">
          {/* Left: Original image */}
          <div className="inference-results__panel">
            <h4 className="inference-results__panel-title">
              {t('inference.results.original')}
            </h4>
            <div className="inference-results__image-wrapper">
              <img
                src={currentPreview.preview}
                alt={currentPreview.name}
                className="inference-results__image"
                crossOrigin="anonymous"
              />
            </div>
            <span className="inference-results__image-name">
              {currentPreview.name}
            </span>
          </div>

          {/* Center: Annotated image */}
          <div className="inference-results__panel">
            <h4 className="inference-results__panel-title">
              {t('inference.results.annotated')}
            </h4>
            <div className="inference-results__image-wrapper">
              {/* Hidden image used as source for canvas drawing */}
              <img
                ref={imgRef}
                src={currentPreview.preview}
                alt=""
                className="inference-results__hidden-img"
                onLoad={handleImageLoad}
                crossOrigin="anonymous"
              />
              <canvas
                ref={canvasRef}
                className="inference-results__canvas"
              />
            </div>
            <span className="inference-results__image-name">
              {t('inference.results.detectionsCount', {
                total: totalDetections,
              })}
            </span>
          </div>

          {/* Right: Detection Summary */}
          <div className="inference-results__panel inference-results__panel--summary">
            <h4 className="inference-results__panel-title">
              {t('inference.results.summary')}
            </h4>
            <ul className="inference-results__defect-list">
              {detectionSummary.map(([className, count]) => (
                <li key={className} className="inference-results__defect-item">
                  <span
                    className="inference-results__defect-dot"
                    style={{
                      backgroundColor:
                        DEFECT_COLOR_MAP[className] ?? '#9CA3AF',
                    }}
                  />
                  <span className="inference-results__defect-name">
                    {t(`defects.${className}`)}
                  </span>
                  <span className="inference-results__defect-count">
                    {count}
                  </span>
                </li>
              ))}
              {detectionSummary.length === 0 && (
                <li className="inference-results__defect-item inference-results__defect-item--empty">
                  {t('inference.results.noDefects')}
                </li>
              )}
            </ul>
            <div className="inference-results__defect-total">
              <span>{t('inference.results.total')}</span>
              <span className="inference-results__defect-total-value">
                {totalDetections}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        {total > 1 && (
          <div className="inference-results__nav">
            <button
              className="inference-results__nav-btn"
              onClick={handlePrev}
              aria-label={t('inference.results.previous')}
            >
              <ChevronLeft size={20} />
            </button>
            <span className="inference-results__nav-indicator">
              {currentIndex + 1} / {total}
            </span>
            <button
              className="inference-results__nav-btn"
              onClick={handleNext}
              aria-label={t('inference.results.next')}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}
