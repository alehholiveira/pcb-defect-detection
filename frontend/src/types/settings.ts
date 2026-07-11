export type EmailVerificationStatus = 'Success' | 'Pending' | 'Failed' | 'TemporaryFailure' | 'NotStarted';

export interface RecipientEmail {
  id: number;
  email: string;
  status: EmailVerificationStatus;
  created_at: string;
}

export interface AddEmailResponse {
  id: number;
  email: string;
  message: string;
}

export interface SchedulesMap {
  daily: boolean;
  weekly: boolean;
  monthly: boolean;
}
