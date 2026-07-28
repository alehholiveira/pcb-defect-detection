import { useState, useCallback } from 'react';
import type { ToastData, ToastVariant } from '../components/Toast';
import { useNotifications } from '../contexts/NotificationContext';

/**
 * Manages toast notifications with a dual-purpose architecture.
 *
 * When a toast is triggered, it creates a temporary visual overlay that automatically
 * dismisses after a timeout. Simultaneously, it persists the notification data into
 * the NotificationContext, allowing users to review past alerts (e.g., error logs or
 * completion statuses) even after the visual toast has disappeared.
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const { addNotification } = useNotifications();

  const addToast = useCallback((message: string, variant: ToastVariant, duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, variant, duration }]);
    addNotification(message, variant);
  }, [addNotification]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
  };
}
