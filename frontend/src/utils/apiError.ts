import axios from 'axios';

export interface ApiErrorResponse {
  code: string;
  message: string;
  description: string;
  statusCode: number;
}

export function parseApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorResponse | undefined;
    if (data && typeof data.message === 'string') {
      return data.message;
    }
    if (err.message) {
      return err.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'An unexpected error occurred';
}
