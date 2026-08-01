import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { env, validateEnv } from '../../src/config/env.js';
import { LAMBDA_ERRORS } from '../../src/utils/errors.js';

describe('Env Config Unit Tests', () => {
  const originalEnv = { ...env };

  afterEach(() => {
    env.S3_BUCKET_NAME = originalEnv.S3_BUCKET_NAME;
    env.SENDER_EMAIL = originalEnv.SENDER_EMAIL;
    env.AWS_REGION = originalEnv.AWS_REGION;
  });

  it('should pass validation when environment variables are set', () => {
    env.S3_BUCKET_NAME = 'my-test-bucket';
    env.SENDER_EMAIL = 'test@example.com';

    expect(() => validateEnv()).not.toThrow();
  });

  it('should throw MISSING_ENV_VARS when S3_BUCKET_NAME is missing', () => {
    env.S3_BUCKET_NAME = '';
    env.SENDER_EMAIL = 'test@example.com';

    try {
      validateEnv();
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toEqual(LAMBDA_ERRORS.MISSING_ENV_VARS);
    }
  });

  it('should throw MISSING_ENV_VARS when SENDER_EMAIL is missing', () => {
    env.S3_BUCKET_NAME = 'my-test-bucket';
    env.SENDER_EMAIL = '';

    try {
      validateEnv();
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toEqual(LAMBDA_ERRORS.MISSING_ENV_VARS);
    }
  });
});
