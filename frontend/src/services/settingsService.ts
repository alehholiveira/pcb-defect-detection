import { api } from './api';
import type { RecipientEmail, AddEmailResponse, SchedulesMap } from '../types/settings';
import { validateSchema } from '../utils/validation';
import { z } from 'zod';

export const AddEmailSchema = z.string().email('Invalid email format');
export const RemoveEmailSchema = z.number().int().positive('Invalid recipient ID');

export const SchedulesMapSchema = z.object({
  daily: z.boolean({ message: 'Daily schedule must be a boolean' }),
  weekly: z.boolean({ message: 'Weekly schedule must be a boolean' }),
  monthly: z.boolean({ message: 'Monthly schedule must be a boolean' }),
});

export async function getRecipientEmails(): Promise<RecipientEmail[]> {
  const response = await api.get<RecipientEmail[]>('/api/v1/settings/emails');
  return response.data;
}

export async function addRecipientEmail(email: string): Promise<AddEmailResponse> {
  validateSchema(AddEmailSchema, email);
  const response = await api.post<AddEmailResponse>('/api/v1/settings/emails', { email });
  return response.data;
}

export async function removeRecipientEmail(id: number): Promise<{ success: boolean }> {
  validateSchema(RemoveEmailSchema, id);
  const response = await api.delete<{ success: boolean }>(`/api/v1/settings/emails/${id}`);
  return response.data;
}

export async function getSchedules(): Promise<SchedulesMap> {
  const response = await api.get<SchedulesMap>('/api/v1/settings/schedules');
  return response.data;
}

export async function updateSchedules(schedules: SchedulesMap): Promise<SchedulesMap> {
  validateSchema(SchedulesMapSchema, schedules);
  const response = await api.put<SchedulesMap>('/api/v1/settings/schedules', schedules);
  return response.data;
}

