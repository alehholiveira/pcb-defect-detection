import { describe, it, expect } from 'vitest';
import { GetReportsSchema, GenerateReportSchema } from '../../../src/controllers/reports.controller.js';

describe('Reports Schemas (Unit)', () => {
  describe('GetReportsSchema', () => {
    it('should parse empty query with default values', () => {
      const parsed = GetReportsSchema.parse({});
      expect(parsed.reportType).toBe('all');
      expect(parsed.sortOrder).toBe('desc');
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(10);
    });

    it('should parse valid reportType values', () => {
      const validTypes = ['all', 'automatic', 'manual', 'daily', 'weekly', 'monthly'];
      for (const reportType of validTypes) {
        const parsed = GetReportsSchema.parse({ reportType });
        expect(parsed.reportType).toBe(reportType);
      }
    });

    it('should fail on invalid reportType', () => {
      const result = GetReportsSchema.safeParse({ reportType: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('GenerateReportSchema', () => {
    it('should pass when reportName and selectedIds are provided', () => {
      const input = {
        reportName: 'Relatório Teste',
        selectedIds: [1, 2, 3],
      };
      const result = GenerateReportSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should pass when reportName and filters are provided', () => {
      const input = {
        reportName: 'Relatório Teste',
        filters: {
          modelName: 'yolo11',
          startDate: '2026-01-01T00:00:00.000Z',
        },
      };
      const result = GenerateReportSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should fail when neither selectedIds nor filters are provided', () => {
      const input = {
        reportName: 'Relatório Teste',
      };
      const result = GenerateReportSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should fail when both selectedIds and excludedIds are provided simultaneously', () => {
      const input = {
        reportName: 'Relatório Teste',
        selectedIds: [1, 2],
        excludedIds: [3, 4],
      };
      const result = GenerateReportSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
