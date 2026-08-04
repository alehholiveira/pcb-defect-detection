import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/testDatabase.js';
import { buildApp } from '../../src/app.js';

describe('Health API (E2E)', () => {
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

  it('GET /health should return health status of service', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    // statusCode can be 200 (healthy) or 503 (unhealth)
    expect([200, 503]).toContain(response.statusCode);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('services');
    expect(body.services.database.status).toBe('connected');
  });
});
