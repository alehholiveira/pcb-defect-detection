import { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Toast.css';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastProps extends ToastData {
  onClose: (id: string) => void;
}

const icons = {
  success: <CheckCircle2 className="toast__icon toast__icon--success" size={20} />,
  error: <XCircle className="toast__icon toast__icon--error" size={20} />,
  info: <Info className="toast__icon toast__icon--info" size={20} />,
  warning: <AlertTriangle className="toast__icon toast__icon--warning" size={20} />,
};

export function Toast({ id, message, variant, duration = 5000, onClose }: ToastProps) {
  const { t } = useTranslation();
  
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <div className={`toast toast--${variant}`} role="alert">
      {icons[variant]}
      <p className="toast__message">{t(message)}</p>
      <button 
        type="button" 
        className="toast__close" 
        onClick={() => onClose(id)}
        aria-label={t('common.close')}
      >
        <X size={16} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}
