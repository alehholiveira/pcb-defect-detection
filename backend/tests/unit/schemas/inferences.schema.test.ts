import { describe, it, expect } from 'vitest';
import { GetInferencesSchema, GetInferenceByIdSchema } from '../../../src/controllers/inferences.controller.js';

describe('Inferences Schemas (Unit)', () => {
  describe('GetInferencesSchema', () => {
    it('should parse valid query params with defaults', () => {
      const parsed = GetInferencesSchema.parse({});
      expect(parsed).toEqual({
        sortOrder: 'desc',
        page: 1,
        limit: 10,
      });
    });

    it('should parse valid query with custom values', () => {
      const input = {
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-31T23:59:59.000Z',
        modelName: 'yolo11',
        defectType: 'mouse_bite',
        sortOrder: 'asc',
        page: '2',
        limit: '20',
      };
      const parsed = GetInferencesSchema.parse(input);
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(20);
      expect(parsed.modelName).toBe('yolo11');
      expect(parsed.sortOrder).toBe('asc');
    });

    it('should fail on invalid date format', () => {
      const result = GetInferencesSchema.safeParse({ startDate: 'invalid-date' });
      expect(result.success).toBe(false);
    });

    it('should fail on page < 1', () => {
      const result = GetInferencesSchema.safeParse({ page: '0' });
      expect(result.success).toBe(false);
    });

    it('should fail on limit > 100', () => {
      const result = GetInferencesSchema.safeParse({ limit: '150' });
      expect(result.success).toBe(false);
    });
  });

  describe('GetInferenceByIdSchema', () => {
    it('should parse valid positive integer ID', () => {
      const parsed = GetInferenceByIdSchema.parse({ id: '123' });
      expect(parsed.id).toBe(123);
    });

    it('should fail on zero or negative ID', () => {
      expect(GetInferenceByIdSchema.safeParse({ id: '0' }).success).toBe(false);
      expect(GetInferenceByIdSchema.safeParse({ id: '-5' }).success).toBe(false);
    });

    it('should fail on non-numeric ID', () => {
      expect(GetInferenceByIdSchema.safeParse({ id: 'abc' }).success).toBe(false);
    });
  });
});
