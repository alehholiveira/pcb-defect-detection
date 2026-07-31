import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from '../helpers/testDatabase.js';
import { createTestRecipientEmail } from '../helpers/factories.js';
import { buildApp } from '../../src/app.js';

vi.mock('../../src/aws/ses.helper.js', () => ({
  verifyEmailIdentity: vi.fn().mockResolvedValue(undefined),
  deleteEmailIdentity: vi.fn().mockResolvedValue(undefined),
  getVerificationStatus: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../src/aws/eventbridge.helper.js', () => ({
  enableRule: vi.fn().mockResolvedValue(undefined),
  disableRule: vi.fn().mockResolvedValue(undefined),
}));

describe('Settings API (E2E)', () => {
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

  it('GET /api/v1/settings/emails should return recipient email list', async () => {
    await createTestRecipientEmail({ email: 'admin@company.com' });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/settings/emails',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.length).toBe(1);
    expect(body[0].email).toBe('admin@company.com');
  });

  it('POST /api/v1/settings/emails should add new email with 201', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/settings/emails',
      payload: { email: 'newalert@company.com' },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.email).toBe('newalert@company.com');
  });

  it('DELETE /api/v1/settings/emails/:id should remove email', async () => {
    const emailRecord = await createTestRecipientEmail({ email: 'to-remove@company.com' });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/settings/emails/${emailRecord.id}`,
    });

    expect(response.statusCode).toBe(200);
  });

  it('GET /api/v1/settings/schedules should return schedule statuses', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/settings/schedules',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toEqual({
      daily: true,
      weekly: true,
      monthly: true,
    });
  });

  it('PUT /api/v1/settings/schedules should update schedule statuses', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/settings/schedules',
      payload: { daily: false, weekly: true, monthly: false },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toEqual({
      daily: false,
      weekly: true,
      monthly: false,
    });
  });
});
