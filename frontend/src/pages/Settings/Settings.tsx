import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2, Mail, Plus, Trash2, Save } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { ToastContainer } from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { isValidEmail } from '../../utils/validation';
import type { SchedulesMap, EmailVerificationStatus } from '../../types/settings';
import './Settings.css';

const STATUS_BADGE_VARIANT: Record<EmailVerificationStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Success: 'success',
  Pending: 'warning',
  Failed: 'danger',
  TemporaryFailure: 'danger',
  NotStarted: 'neutral',
};

export function Settings() {
  const { t } = useTranslation();
  const {
    emails,
    schedules,
    loading,
    error,
    emailsLoading,
    schedulesLoading,
    addEmail,
    removeEmail,
    saveSchedules,
  } = useSettings();

  // Toast hook
  const { toasts, addToast, removeToast } = useToast();

  // Add Email Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  // Local schedule state (for dirty checking)
  const [localSchedules, setLocalSchedules] = useState<SchedulesMap | null>(null);

  // Sync local schedules when server data arrives
  const effectiveSchedules = localSchedules ?? schedules;

  const hasScheduleChanges = useMemo(() => {
    if (!schedules || !effectiveSchedules) return false;
    return (
      schedules.daily !== effectiveSchedules.daily ||
      schedules.weekly !== effectiveSchedules.weekly ||
      schedules.monthly !== effectiveSchedules.monthly
    );
  }, [schedules, effectiveSchedules]);

  // ── Email handlers ──

  const handleAddEmail = async () => {
    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail) return;

    if (!isValidEmail(trimmedEmail)) {
      addToast(t('settings.emails.toast.invalidFormat', 'E-mail inválido'), 'error');
      return;
    }

    try {
      await addEmail(trimmedEmail);
      addToast(t('settings.emails.toast.added'), 'success');
      setNewEmail('');
      setIsModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('settings.emails.toast.error');
      addToast(message, 'error');
    }
  };

  const handleRemoveEmail = async (id: number) => {
    if (!window.confirm(t('settings.emails.deleteConfirm'))) return;
    try {
      await removeEmail(id);
      addToast(t('settings.emails.toast.removed'), 'success');
    } catch {
      addToast(t('settings.emails.toast.error'), 'error');
    }
  };

  // ── Schedule handlers ──

  const handleToggleSchedule = (key: keyof SchedulesMap) => {
    const current = effectiveSchedules ?? { daily: true, weekly: true, monthly: true };
    setLocalSchedules({ ...current, [key]: !current[key] });
  };

  const handleSaveSchedules = async () => {
    if (!effectiveSchedules) return;
    try {
      await saveSchedules(effectiveSchedules);
      setLocalSchedules(null);
      addToast(t('settings.schedules.toast.saved'), 'success');
    } catch {
      addToast(t('settings.schedules.toast.error'), 'error');
    }
  };

  // ── Render ──

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-page__loading">
          <Loader2 size={32} className="animate-spin" />
          <p>{t('settings.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">{t('settings.page.title')}</h1>
        <p className="settings-page__subtitle">{t('settings.page.subtitle')}</p>
      </div>

      {error && (
        <div className="settings-page__error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Emails Section ── */}
      <div className="settings-page__section">
        <Card
          title={t('settings.emails.title')}
          headerAction={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setIsModalOpen(true)}
            >
              {t('settings.emails.addButton')}
            </Button>
          }
          noPadding
        >
          {emails.length === 0 ? (
            <div className="settings-emails__empty">
              <Mail size={40} strokeWidth={1.2} />
              <p>{t('settings.emails.emptyState')}</p>
            </div>
          ) : (
            <table className="settings-emails__table">
              <thead>
                <tr>
                  <th>{t('settings.emails.columns.email')}</th>
                  <th>{t('settings.emails.columns.status')}</th>
                  <th className="settings-emails__header-actions">{t('settings.emails.columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {emails.map(email => (
                  <tr key={email.id}>
                    <td>{email.email}</td>
                    <td>
                      <Badge
                        variant={STATUS_BADGE_VARIANT[email.status] ?? 'neutral'}
                        dot
                      >
                        {t(`settings.emails.status.${email.status}`, email.status)}
                      </Badge>
                    </td>
                    <td className="settings-emails__actions">
                      <button
                        type="button"
                        className="settings-emails__delete-btn"
                        onClick={() => handleRemoveEmail(email.id)}
                        disabled={emailsLoading}
                        aria-label={t('settings.emails.removeAriaLabel', 'Remove recipient {{email}}', { email: email.email })}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ── Schedules Section ── */}
      {effectiveSchedules && (
        <div className="settings-page__section">
          <Card
            title={t('settings.schedules.title')}
            subtitle={t('settings.schedules.subtitle')}
          >
            <div className="settings-schedules__list">
              {(['daily', 'weekly', 'monthly'] as const).map(key => (
                <div key={key} className="settings-schedules__item">
                  <div className="settings-schedules__info">
                    <span className="settings-schedules__label">
                      {t(`settings.schedules.${key}.label`)}
                    </span>
                    <span className="settings-schedules__description">
                      {t(`settings.schedules.${key}.description`)}
                    </span>
                  </div>
                  <ToggleSwitch
                    id={`schedule-${key}`}
                    checked={effectiveSchedules[key]}
                    onChange={() => handleToggleSchedule(key)}
                    label={t(`settings.schedules.${key}.label`)}
                  />
                </div>
              ))}
            </div>

            <div className="settings-schedules__footer">
              <Button
                variant="primary"
                icon={<Save size={16} />}
                onClick={handleSaveSchedules}
                loading={schedulesLoading}
                disabled={!hasScheduleChanges}
              >
                {t('settings.schedules.save')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Add Email Modal ── */}
      <Modal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setNewEmail(''); }}
        title={t('settings.emails.modal.title')}
        size="sm"
      >
        <div className="settings-emails__modal-form">
          <Input
            type="email"
            placeholder={t('settings.emails.modal.placeholder')}
            icon={<Mail size={16} />}
            value={newEmail}
            onChange={setNewEmail}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') handleAddEmail();
            }}
          />
          <div className="settings-emails__modal-actions">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setIsModalOpen(false); setNewEmail(''); }}
            >
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={handleAddEmail}
              loading={emailsLoading}
              disabled={!newEmail.trim()}
            >
              {t('settings.emails.modal.submit')}
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
