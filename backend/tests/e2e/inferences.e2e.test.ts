import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from '../helpers/testDatabase.js';
import { createTestInference, createTestInferenceImage, createTestDetection } from '../helpers/factories.js';
import { buildApp } from '../../src/app.js';

describe('Inferences API (E2E)', () => {
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

  it('GET /api/v1/inferences should return 200 and list inferences', async () => {
    await createTestInference({ model_name: 'yolo11' });
    await createTestInference({ model_name: 'faster_rcnn' });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/inferences?page=1&limit=10',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.meta.total).toBe(2);
    expect(body.data.length).toBe(2);
  });

  it('GET /api/v1/inferences/:id should return 200 with details when found', async () => {
    const inf = await createTestInference({ model_name: 'rt_detr' });
    const img = await createTestInferenceImage(inf.id);
    await createTestDetection(img.id);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/inferences/${inf.id}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.id).toBe(inf.id);
    expect(body.model_name).toBe('rt_detr');
    expect(body.images.length).toBe(1);
  });

  it('GET /api/v1/inferences/:id should return 404 when not found', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/inferences/99999',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.code).toBe('ERR_RESOURCE_NOT_FOUND');
  });

  it('DELETE /api/v1/inferences/:id should return 204 on success', async () => {
    const inf = await createTestInference({ model_name: 'yolo11' });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/inferences/${inf.id}`,
    });

    expect(response.statusCode).toBe(204);

    // Verify deletion
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/inferences/${inf.id}`,
    });
    expect(getRes.statusCode).toBe(404);
  });
});
