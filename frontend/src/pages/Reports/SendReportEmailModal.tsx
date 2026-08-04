import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { getRecipientEmails } from '../../services/settingsService';
import { sendReportEmail } from '../../services/reportService';
import type { ToastVariant } from '../../components/Toast';
import './SendReportEmailModal.css';

interface SendReportEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string | null;
  addToast: (message: string, variant: ToastVariant, duration?: number) => void;
}

export function SendReportEmailModal({ isOpen, onClose, filename, addToast }: SendReportEmailModalProps) {
  const { t, i18n } = useTranslation();
  
  const [emails, setEmails] = useState<string[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadEmails();
    } else {
      // Reset state when closed
      setSelectedEmails(new Set());
    }
  }, [isOpen]);

  const loadEmails = async () => {
    try {
      setLoading(true);
      const data = await getRecipientEmails();
      // Filter only successfully verified emails
      const verified = data.filter(r => r.status === 'Success').map(r => r.email);
      setEmails(verified);
    } catch (error) {
      console.error('Error fetching emails:', error);
      addToast(t('reports.errors.fetchFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEmail = (email: string) => {
    const next = new Set(selectedEmails);
    if (next.has(email)) {
      next.delete(email);
    } else {
      next.add(email);
    }
    setSelectedEmails(next);
  };

  const handleSend = () => {
    if (!filename || selectedEmails.size === 0) return;
    
    setSending(true);
    sendReportEmail(filename, Array.from(selectedEmails), i18n.language)
      .then(() => {
        addToast(t('reports.sendEmailSuccess'), 'success');
        onClose();
      })
      .catch((error) => {
        console.error('Error sending report email:', error);
        addToast(t('reports.sendEmailError'), 'error');
      })
      .finally(() => {
        setSending(false);
      });
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={t('reports.sendEmailTitle')}
      size="md"
    >
      <div className="send-email-modal__content">
        <p className="send-email-modal__subtitle">
          {t('reports.selectRecipients')}
        </p>

        {loading ? (
          <div className="send-email-modal__loading">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : emails.length === 0 ? (
          <div className="send-email-modal__empty">
            <AlertCircle size={32} />
            <p>{t('reports.noRecipientsFound')}</p>
          </div>
        ) : (
          <div className="send-email-modal__list">
            {emails.map(email => (
              <label key={email} className="send-email-modal__item">
                <input
                  type="checkbox"
                  checked={selectedEmails.has(email)}
                  onChange={() => handleToggleEmail(email)}
                  className="send-email-modal__checkbox"
                />
                <span className="send-email-modal__email">{email}</span>
              </label>
            ))}
          </div>
        )}

        <div className="send-email-modal__actions">
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            {t('reports.cancel')}
          </Button>
          <Button
            variant="primary"
            icon={sending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            onClick={handleSend}
            disabled={selectedEmails.size === 0 || sending || loading || emails.length === 0}
          >
            {t('reports.send')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
