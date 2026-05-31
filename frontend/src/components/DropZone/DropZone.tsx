import { useRef, useState, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './DropZone.css';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

export function DropZone({
  onFilesSelected,
  accept = 'image/jpeg,image/png',
  multiple = true,
  maxSize = 10 * 1024 * 1024,
  maxFiles,
  disabled = false,
  className = '',
}: DropZoneProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const acceptedTypes = accept.split(',').map((t) => t.trim());

  const validateFiles = useCallback(
    (fileList: FileList | File[]): File[] => {
      let files = Array.from(fileList);

      // Filter by type
      files = files.filter((file) => {
        return acceptedTypes.some((type) => {
          if (type.endsWith('/*')) {
            return file.type.startsWith(type.replace('/*', '/'));
          }
          return file.type === type;
        });
      });

      // Filter by size
      files = files.filter((file) => file.size <= maxSize);

      // Limit count
      if (maxFiles && files.length > maxFiles) {
        files = files.slice(0, maxFiles);
      }

      return files;
    },
    [acceptedTypes, maxSize, maxFiles],
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const validated = validateFiles(e.dataTransfer.files);
      if (validated.length > 0) {
        onFilesSelected(validated);
      }
    },
    [disabled, validateFiles, onFilesSelected],
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;

      const validated = validateFiles(e.target.files);
      if (validated.length > 0) {
        onFilesSelected(validated);
      }

      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [validateFiles, onFilesSelected],
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled],
  );

  const formatMaxSize = () => {
    const mb = maxSize / (1024 * 1024);
    return `${mb}MB`;
  };

  const formatAcceptedTypes = () => {
    return acceptedTypes
      .map((type) => {
        const ext = type.split('/')[1]?.toUpperCase();
        return ext || type;
      })
      .join(', ');
  };

  return (
    <div
      className={[
        'dropzone',
        isDragOver ? 'dropzone--drag-over' : '',
        disabled ? 'dropzone--disabled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={t('dropzone.ariaLabel', 'Área de upload de arquivos')}
      aria-disabled={disabled}
    >
      <input
        ref={inputRef}
        type="file"
        className="dropzone__input"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className="dropzone__content">
        <div className="dropzone__icon">
          <Upload size={32} />
        </div>
        <p className="dropzone__title">
          {t(
            'dropzone.title',
            'Arraste e solte seus arquivos aqui ou clique para selecionar',
          )}
        </p>
        <p className="dropzone__hint">
          {t('dropzone.hint', 'Formatos aceitos: {{formats}} — Máx. {{maxSize}}', {
            formats: formatAcceptedTypes(),
            maxSize: formatMaxSize(),
          })}
          {maxFiles &&
            ` — ${t('dropzone.maxFiles', 'Máx. {{count}} arquivo(s)', {
              count: maxFiles,
            })}`}
        </p>
      </div>
    </div>
  );
}
