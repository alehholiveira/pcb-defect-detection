import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockListReportMetadataKeys = vi.fn();
const mockGetJsonFromS3 = vi.fn();

vi.mock('../../../src/aws/s3.helper.js', () => ({
  listReportMetadataKeys: () => mockListReportMetadataKeys(),
  getJsonFromS3: (key: string) => mockGetJsonFromS3(key),
}));

import { getReportsService, ReportMetadata } from '../../../src/services/reports.service.js';

const createDummyLogger = () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  child: vi.fn(),
  level: 'info',
  fatal: vi.fn(),
} as any);

describe('getReportsService (Unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const dummyReport1: ReportMetadata = {
    reportName: 'Relatório Diário 01',
    filename: 'report_01.pptx',
    downloadUrl: 'http://s3/report_01.pptx',
    generatedAt: '2026-01-10T10:00:00.000Z',
    reportType: 'daily',
    periodStart: '2026-01-10T00:00:00.000Z',
    periodEnd: '2026-01-10T23:59:59.000Z',
    totalInferences: 5,
    totalImages: 10,
    totalDefects: 12,
    defectsByType: { mouse_bite: 12 },
    generatedBy: 'system',
  };

  const dummyReport2: ReportMetadata = {
    reportName: 'Relatório Manual 02',
    filename: 'report_02.pptx',
    downloadUrl: 'http://s3/report_02.pptx',
    generatedAt: '2026-01-15T15:00:00.000Z',
    reportType: 'manual',
    periodStart: '2026-01-15T00:00:00.000Z',
    periodEnd: '2026-01-15T23:59:59.000Z',
    totalInferences: 2,
    totalImages: 4,
    totalDefects: 3,
    defectsByType: { spur: 3 },
    generatedBy: 'user',
  };

  it('should fetch and return all reports paginated', async () => {
    mockListReportMetadataKeys.mockResolvedValue(['reports/r1.json', 'reports/r2.json']);
    mockGetJsonFromS3.mockImplementation((key: string) => {
      if (key === 'reports/r1.json') return Promise.resolve(dummyReport1);
      return Promise.resolve(dummyReport2);
    });

    const logger = createDummyLogger();
    const result = await getReportsService({ reportType: 'all', page: 1, limit: 10, sortOrder: 'desc' }, logger);

    expect(result.meta.total).toBe(2);
    expect(result.data.length).toBe(2);
    // Sort order desc: dummyReport2 (Jan 15) before dummyReport1 (Jan 10)
    expect(result.data[0].filename).toBe('report_02.pptx');
    expect(result.data[1].filename).toBe('report_01.pptx');
  });

  it('should filter reports by reportType', async () => {
    mockListReportMetadataKeys.mockResolvedValue(['reports/r1.json', 'reports/r2.json']);
    mockGetJsonFromS3.mockImplementation((key: string) => {
      if (key === 'reports/r1.json') return Promise.resolve(dummyReport1);
      return Promise.resolve(dummyReport2);
    });

    const logger = createDummyLogger();
    const result = await getReportsService({ reportType: 'manual', page: 1, limit: 10, sortOrder: 'desc' }, logger);

    expect(result.meta.total).toBe(1);
    expect(result.data[0].reportType).toBe('manual');
  });

  it('should filter reports by date range', async () => {
    mockListReportMetadataKeys.mockResolvedValue(['reports/r1.json', 'reports/r2.json']);
    mockGetJsonFromS3.mockImplementation((key: string) => {
      if (key === 'reports/r1.json') return Promise.resolve(dummyReport1);
      return Promise.resolve(dummyReport2);
    });

    const logger = createDummyLogger();
    const result = await getReportsService({
      reportType: 'all',
      startDate: '2026-01-12T00:00:00.000Z',
      page: 1,
      limit: 10,
      sortOrder: 'desc',
    }, logger);

    expect(result.meta.total).toBe(1);
    expect(result.data[0].filename).toBe('report_02.pptx');
  });
});
