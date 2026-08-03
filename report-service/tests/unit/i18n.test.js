import { describe, it, expect } from 'vitest';
import { formatDate, formatDateRange, buildReportEmailHtml } from '../../src/utils/i18n.js';

describe('i18n utility tests', () => {
  describe('formatDate', () => {
    it('should format date in DD/MM/YYYY for pt-BR', () => {
      expect(formatDate('2026-08-01', 'pt-BR')).toBe('01/08/2026');
    });

    it('should format date in MM/DD/YYYY for en', () => {
      expect(formatDate('2026-08-01', 'en')).toBe('08/01/2026');
    });

    it('should handle invalid date string gracefully', () => {
      expect(formatDate('invalid-date', 'pt-BR')).toBe('invalid-date');
    });
  });

  describe('formatDateRange', () => {
    it('should return single date if oldest equals newest in pt-BR', () => {
      expect(formatDateRange('2026-08-01', '2026-08-01', 'pt-BR')).toBe('01/08/2026');
    });

    it('should return date range with "até" for pt-BR', () => {
      expect(formatDateRange('2026-08-01', '2026-08-07', 'pt-BR')).toBe('01/08/2026 até 07/08/2026');
    });

    it('should return date range with "to" for en', () => {
      expect(formatDateRange('2026-08-01', '2026-08-07', 'en')).toBe('08/01/2026 to 08/07/2026');
    });
  });

  describe('buildReportEmailHtml', () => {
    it('should generate valid HTML containing title, stats and defect table in pt-BR', () => {
      const html = buildReportEmailHtml({
        reportTitle: 'Relatório Diário',
        periodLabel: '01/08/2026',
        stats: { totalInferences: 5, totalImages: 10, totalDefects: 3 },
        defectsByType: { missing_hole: 2, mouse_bite: 1 },
        downloadUrl: 'https://example.com/report.pptx',
      }, 'pt-BR');

      expect(html).toContain('Relatório Diário');
      expect(html).toContain('Resumo da Análise');
      expect(html).toContain('missing_hole');
      expect(html).toContain('https://example.com/report.pptx');
    });

    it('should generate valid HTML in en', () => {
      const html = buildReportEmailHtml({
        reportTitle: 'Daily Report',
        periodLabel: '08/01/2026',
        stats: { totalInferences: 5, totalImages: 10, totalDefects: 3 },
        defectsByType: {},
        downloadUrl: 'https://example.com/report.pptx',
      }, 'en');

      expect(html).toContain('Daily Report');
      expect(html).toContain('Analysis Summary');
      expect(html).toContain('Download PowerPoint Report (PPTX)');
    });
  });
});
