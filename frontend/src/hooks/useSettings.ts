import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getRecipientEmails, addRecipientEmail, removeRecipientEmail, getSchedules, updateSchedules } from '../services/settingsService';
import type { RecipientEmail, SchedulesMap } from '../types/settings';
import { parseApiError } from '../utils/apiError';

export function useSettings() {
  const { t } = useTranslation();
  const [emails, setEmails] = useState<RecipientEmail[]>([]);
  const [schedules, setSchedules] = useState<SchedulesMap | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [emailsLoading, setEmailsLoading] = useState<boolean>(false);
  const [schedulesLoading, setSchedulesLoading] = useState<boolean>(false);

  const fetchEmails = useCallback(async () => {
    setError(null);
    try {
      const data = await getRecipientEmails();
      setEmails(data);
    } catch (err: unknown) {
      console.error('Failed to fetch emails', err);
      const apiMsg = parseApiError(err);
      setError(apiMsg === 'An unexpected error occurred' ? t('settings.errors.fetchEmailsFailed') : apiMsg);
    }
  }, [t]);

  const fetchSchedules = useCallback(async () => {
    setError(null);
    try {
      const data = await getSchedules();
      setSchedules(data);
    } catch (err: unknown) {
      console.error('Failed to fetch schedules', err);
      const apiMsg = parseApiError(err);
      setError(apiMsg === 'An unexpected error occurred' ? t('settings.errors.fetchSchedulesFailed') : apiMsg);
    }
  }, [t]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchEmails(), fetchSchedules()]);
    } finally {
      setLoading(false);
    }
  }, [fetchEmails, fetchSchedules]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addEmail = useCallback(async (email: string) => {
    setEmailsLoading(true);
    setError(null);
    try {
      await addRecipientEmail(email);
      await fetchEmails();
      return true;
    } catch (err: unknown) {
      const apiMsg = parseApiError(err);
      const message = apiMsg === 'An unexpected error occurred' ? t('settings.errors.addEmailFailed') : apiMsg;
      throw new Error(message);
    } finally {
      setEmailsLoading(false);
    }
  }, [fetchEmails, t]);

  const removeEmail = useCallback(async (id: number) => {
    setEmailsLoading(true);
    setError(null);
    try {
      await removeRecipientEmail(id);
      await fetchEmails();
      return true;
    } catch (err: unknown) {
      const apiMsg = parseApiError(err);
      const message = apiMsg === 'An unexpected error occurred' ? t('settings.errors.removeEmailFailed') : apiMsg;
      throw new Error(message);
    } finally {
      setEmailsLoading(false);
    }
  }, [fetchEmails, t]);

  const saveSchedules = useCallback(async (newSchedules: SchedulesMap) => {
    setSchedulesLoading(true);
    setError(null);
    try {
      const data = await updateSchedules(newSchedules);
      setSchedules(data);
      return true;
    } catch (err: unknown) {
      const apiMsg = parseApiError(err);
      const message = apiMsg === 'An unexpected error occurred' ? t('settings.errors.updateSchedulesFailed') : apiMsg;
      throw new Error(message);
    } finally {
      setSchedulesLoading(false);
    }
  }, [t]);

  return {
    emails,
    schedules,
    loading,
    error,
    emailsLoading,
    schedulesLoading,
    addEmail,
    removeEmail,
    saveSchedules,
    refresh: fetchAll,
  };
}

