import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from '../helpers/testDatabase.js';
import { createTestInference } from '../helpers/factories.js';
import { buildApp } from '../../src/app.js';

vi.mock('../../src/aws/s3.helper.js', () => ({
  listReportMetadataKeys: vi.fn().mockResolvedValue(['reports/r1.json']),
  getJsonFromS3: vi.fn().mockResolvedValue({
    reportName: 'Relatório Diário',
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
  }),
}));

vi.mock('../../src/aws/sqs.helper.js', () => ({
  sendReportRequest: vi.fn().mockResolvedValue('msg-id-999'),
}));

describe('Reports API (E2E)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    await setupTestDatabase();
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('GET /api/v1/reports should return 200 and list of reports', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports?page=1&limit=10',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.meta.total).toBe(1);
    expect(body.data[0].filename).toBe('report_01.pptx');
  });

  it('POST /api/v1/reports/generate should return 201 when selectedIds exist in DB', async () => {
    const inf1 = await createTestInference();
    const inf2 = await createTestInference();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/generate',
      payload: {
        reportName: 'Relatório Customizado',
        selectedIds: [inf1.id, inf2.id],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.messageId).toBe('msg-id-999');
    expect(body.inferenceCount).toBe(2);
  });
});
