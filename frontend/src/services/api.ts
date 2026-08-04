import axios from 'axios'

export const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Intercepts all incoming responses to normalize error messages and structure.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Silently reject aborted requests (e.g. component unmount) without triggering global error handlers
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    let message = 'An unexpected error occurred';
    if (error.response && error.response.data) {
      const data = error.response.data;
      if (typeof data === 'string') {
        message = data;
      } else if (data.message) {
        message = data.message;
      } else if (data.error) {
        message = data.error;
      }
    } else if (error.message) {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
)
