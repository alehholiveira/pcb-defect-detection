import { describe, it, expect } from 'vitest';
import { API_ERRORS, AppError } from '../../../src/utils/errors.js';

describe('API Errors & AppError (Unit)', () => {
  it('should verify all API_ERRORS definitions have valid status code, message and code', () => {
    Object.entries(API_ERRORS).forEach(([key, errorObj]) => {
      expect(errorObj).toHaveProperty('code');
      expect(errorObj).toHaveProperty('message');
      expect(errorObj).toHaveProperty('statusCode');
      expect(typeof errorObj.statusCode).toBe('number');
      expect(errorObj.statusCode).toBeGreaterThanOrEqual(400);
      expect(errorObj.statusCode).toBeLessThan(600);
    });
  });

  it('should instantiate AppError properly from API_ERRORS entry', () => {
    const error = new AppError(API_ERRORS.RESOURCE_NOT_FOUND);
    expect(error.name).toBe('AppError');
    expect(error.message).toBe(API_ERRORS.RESOURCE_NOT_FOUND.message);
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    expect(error.description).toBe(API_ERRORS.RESOURCE_NOT_FOUND.description);
  });
});
