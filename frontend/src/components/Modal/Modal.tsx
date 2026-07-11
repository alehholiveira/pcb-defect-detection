import { type ReactNode, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Modal.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({
  open,
  onClose,
  children,
  title,
  size = 'md',
}: ModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
      document.body.style.overflow = 'hidden';
    } else {
      if (dialog.open) {
        dialog.close();
      }
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  const handleCancel = useCallback(
    (e: React.SyntheticEvent<HTMLDialogElement>) => {
      e.preventDefault();
      onClose();
    },
    [onClose],
  );

  return (
    <dialog
      ref={dialogRef}
      className={`modal modal--${size}`}
      onClick={handleBackdropClick}
      onCancel={handleCancel}
      aria-label={title ?? t('modal.dialog')}
    >
      <div className="modal__card">
        <div className="modal__header">
          {title && <h2 className="modal__title">{title}</h2>}
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label={t('modal.close')}
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </dialog>
  );
}
