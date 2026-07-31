import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from '../helpers/testDatabase.js';
import { createTestInference, createTestInferenceImage, createTestDetection } from '../helpers/factories.js';
import { buildApp } from '../../src/app.js';

describe('Metrics API (E2E)', () => {
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

  it('GET /api/v1/metrics should return 200 and metrics payload', async () => {
    const inf = await createTestInference({ model_name: 'yolo11' });
    const img = await createTestInferenceImage(inf.id);
    await createTestDetection(img.id);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/metrics?granularity=daily',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('defectDistribution');
  });
});
