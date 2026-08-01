import { describe, it, expect } from 'vitest';
import { buildReportEmailHtml, emailTranslations } from '../../../src/utils/i18n.js';
import type { ReportMetadata } from '../../../src/services/reports.service.js';

describe('i18n Email Template Unit Tests', () => {
  const mockReport: ReportMetadata = {
    reportName: 'Relatório Semanal PCB',
    filename: '2026-08-01-report.json',
    downloadUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/reports/2026-08-01-report.pptx',
    generatedAt: '2026-08-01T12:00:00.000Z',
    reportType: 'weekly',
    periodStart: '2026-07-25T00:00:00.000Z',
    periodEnd: '2026-08-01T00:00:00.000Z',
    totalInferences: 45,
    totalImages: 90,
    totalDefects: 12,
    defectsByType: {
      mouse_bite: 5,
      spur: 7,
    },
    generatedBy: 'system',
  };

  it('should generate valid pt-BR HTML template with report details', () => {
    const html = buildReportEmailHtml(mockReport, 'pt-BR');

    expect(html).toContain(mockReport.reportName);
    expect(html).toContain(emailTranslations['pt-BR'].summaryTitle);
    expect(html).toContain(mockReport.downloadUrl);
    expect(html).toContain('mouse_bite');
    expect(html).toContain('5');
    expect(html).toContain('spur');
    expect(html).toContain('7');
  });

  it('should generate valid English HTML template with localized labels', () => {
    const html = buildReportEmailHtml(mockReport, 'en');

    expect(html).toContain(mockReport.reportName);
    expect(html).toContain(emailTranslations['en'].summaryTitle);
    expect(html).toContain(mockReport.downloadUrl);
    expect(html).toContain('Download PowerPoint Report');
  });
});
