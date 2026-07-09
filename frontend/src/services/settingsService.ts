import { api } from './api';
import type { RecipientEmail, AddEmailResponse, SchedulesMap } from '../types/settings.types';

export async function getRecipientEmails(): Promise<RecipientEmail[]> {
  const response = await api.get<RecipientEmail[]>('/api/v1/settings/emails');
  return response.data;
}

export async function addRecipientEmail(email: string): Promise<AddEmailResponse> {
  const response = await api.post<AddEmailResponse>('/api/v1/settings/emails', { email });
  return response.data;
}

export async function removeRecipientEmail(id: number): Promise<{ success: boolean }> {
  const response = await api.delete<{ success: boolean }>(`/api/v1/settings/emails/${id}`);
  return response.data;
}

export async function getSchedules(): Promise<SchedulesMap> {
  const response = await api.get<SchedulesMap>('/api/v1/settings/schedules');
  return response.data;
}

export async function updateSchedules(schedules: SchedulesMap): Promise<SchedulesMap> {
  const response = await api.put<SchedulesMap>('/api/v1/settings/schedules', schedules);
  return response.data;
}
