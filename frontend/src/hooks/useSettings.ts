import { useState, useEffect, useCallback } from 'react';
import { getRecipientEmails, addRecipientEmail, removeRecipientEmail, getSchedules, updateSchedules } from '../services/settingsService';
import type { RecipientEmail, SchedulesMap } from '../types/settings.types';

export function useSettings() {
  const [emails, setEmails] = useState<RecipientEmail[]>([]);
  const [schedules, setSchedules] = useState<SchedulesMap | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [emailsLoading, setEmailsLoading] = useState<boolean>(false);
  const [schedulesLoading, setSchedulesLoading] = useState<boolean>(false);

  const fetchEmails = useCallback(async () => {
    try {
      const data = await getRecipientEmails();
      setEmails(data);
    } catch (err: any) {
      console.error('Failed to fetch emails', err);
      setError(err.response?.data?.message || 'Failed to fetch emails');
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      const data = await getSchedules();
      setSchedules(data);
    } catch (err: any) {
      console.error('Failed to fetch schedules', err);
      setError(err.response?.data?.message || 'Failed to fetch schedules');
    }
  }, []);

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
    try {
      await addRecipientEmail(email);
      await fetchEmails();
      return true;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to add email';
      throw new Error(message);
    } finally {
      setEmailsLoading(false);
    }
  }, [fetchEmails]);

  const removeEmail = useCallback(async (id: number) => {
    setEmailsLoading(true);
    try {
      await removeRecipientEmail(id);
      await fetchEmails();
      return true;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to remove email';
      throw new Error(message);
    } finally {
      setEmailsLoading(false);
    }
  }, [fetchEmails]);

  const saveSchedules = useCallback(async (newSchedules: SchedulesMap) => {
    setSchedulesLoading(true);
    try {
      const data = await updateSchedules(newSchedules);
      setSchedules(data);
      return true;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to update schedules';
      throw new Error(message);
    } finally {
      setSchedulesLoading(false);
    }
  }, []);

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
