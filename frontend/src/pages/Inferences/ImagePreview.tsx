import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { FilePreview as FilePreviewType } from '../../hooks/useInference'
import './ImagePreview.css'

interface ImagePreviewProps {
  filePreviews: FilePreviewType[]
  onRemoveFile: (index: number) => void
  onClearAll: () => void
}

export function ImagePreview({
  filePreviews,
  onRemoveFile,
  onClearAll,
}: ImagePreviewProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [maxVisible, setMaxVisible] = useState(8)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect
      // Item width is 140px + 12px gap
      const count = Math.max(1, Math.floor(width / 152))
      setMaxVisible(count)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  if (filePreviews.length === 0) return null

  const isOverflowing = filePreviews.length > maxVisible
  const visibleCount = isOverflowing ? Math.max(1, maxVisible - 1) : filePreviews.length
  
  const visiblePreviews = filePreviews.slice(0, visibleCount)
  const extraCount = filePreviews.length - visibleCount

  return (
    <div className="image-preview">
      <div className="image-preview__header">
        <span className="image-preview__title">
          {t('inference.preview.title')}
          <span className="image-preview__count">{filePreviews.length}</span>
        </span>
        <button className="image-preview__clear" onClick={onClearAll}>
          {t('inference.preview.clearAll')}
        </button>
      </div>

      <div className="image-preview__grid" ref={containerRef}>
        {visiblePreviews.map((fp, index) => (
          <div key={`${fp.name}-${index}`} className="image-preview__item">
            <img
              src={fp.preview}
              alt={fp.name}
              className="image-preview__img"
            />
            <div className="image-preview__info">
              <span className="image-preview__name">{fp.name}</span>
            </div>
            <button
              className="image-preview__remove"
              onClick={() => onRemoveFile(index)}
              aria-label={t('inference.preview.remove')}
            >
              <X />
            </button>
          </div>
        ))}

        {extraCount > 0 && (
          <div className="image-preview__more">
            <div className="image-preview__more-inner">
              <div className="image-preview__more-text">+{extraCount}</div>
              <div className="image-preview__more-label">
                {t('inference.preview.more')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
