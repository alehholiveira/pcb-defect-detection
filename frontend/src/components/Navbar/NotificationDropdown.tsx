import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, Info, AlertTriangle, Trash2, BellOff } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatTimeAgo } from '../../utils/formatTimeAgo';
import './NotificationDropdown.css';

const icons = {
  success: <CheckCircle2 className="notification-item__icon notification-item__icon--success" size={18} />,
  error: <XCircle className="notification-item__icon notification-item__icon--error" size={18} />,
  info: <Info className="notification-item__icon notification-item__icon--info" size={18} />,
  warning: <AlertTriangle className="notification-item__icon notification-item__icon--warning" size={18} />,
};

export function NotificationDropdown() {
  const { t } = useTranslation();
  const { notifications, clearAll } = useNotifications();
  const { language } = useLanguage();

  return (
    <div className="notification-dropdown">
      <div className="notification-dropdown__header">
        <h3 className="notification-dropdown__title">{t('notifications.title')}</h3>
        {notifications.length > 0 && (
          <button
            type="button"
            className="notification-dropdown__clear-btn"
            onClick={clearAll}
            aria-label={t('notifications.clearAll')}
          >
            <Trash2 size={14} />
            <span>{t('notifications.clearAll')}</span>
          </button>
        )}
      </div>

      <div className="notification-dropdown__content">
        {notifications.length === 0 ? (
          <div className="notification-dropdown__empty">
            <BellOff size={32} className="notification-dropdown__empty-icon" />
            <p className="notification-dropdown__empty-text">{t('notifications.empty')}</p>
          </div>
        ) : (
          <ul className="notification-dropdown__list">
            {notifications.map((notif) => (
              <li
                key={notif.id}
                className={`notification-item notification-item--${notif.variant} ${
                  !notif.read ? 'notification-item--unread' : ''
                }`}
              >
                {icons[notif.variant]}
                <div className="notification-item__body">
                  <p className="notification-item__message">{t(notif.message)}</p>
                  <span className="notification-item__time">
                    {formatTimeAgo(notif.timestamp, language, t)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
