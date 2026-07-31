import { describe, it, expect } from 'vitest';
import { AddEmailBodySchema, EmailIdParamSchema, UpdateSchedulesBodySchema } from '../../../src/controllers/settings.controller.js';

describe('Settings Schemas (Unit)', () => {
  describe('AddEmailBodySchema', () => {
    it('should validate valid email address', () => {
      const parsed = AddEmailBodySchema.parse({ email: 'user@example.com' });
      expect(parsed.email).toBe('user@example.com');
    });

    it('should reject invalid email address', () => {
      expect(AddEmailBodySchema.safeParse({ email: 'invalid-email' }).success).toBe(false);
      expect(AddEmailBodySchema.safeParse({ email: '' }).success).toBe(false);
    });
  });

  describe('EmailIdParamSchema', () => {
    it('should parse valid positive ID', () => {
      const parsed = EmailIdParamSchema.parse({ id: '10' });
      expect(parsed.id).toBe(10);
    });

    it('should reject invalid ID', () => {
      expect(EmailIdParamSchema.safeParse({ id: '-1' }).success).toBe(false);
      expect(EmailIdParamSchema.safeParse({ id: 'abc' }).success).toBe(false);
    });
  });

  describe('UpdateSchedulesBodySchema', () => {
    it('should validate boolean flags for schedules', () => {
      const input = { daily: true, weekly: false, monthly: true };
      const parsed = UpdateSchedulesBodySchema.parse(input);
      expect(parsed).toEqual(input);
    });

    it('should reject non-boolean schedule flags', () => {
      expect(UpdateSchedulesBodySchema.safeParse({ daily: 'true', weekly: false, monthly: true }).success).toBe(false);
    });
  });
});
