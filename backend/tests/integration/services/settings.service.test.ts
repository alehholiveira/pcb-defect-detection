import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from '../../helpers/testDatabase.js';
import { createTestRecipientEmail } from '../../helpers/factories.js';
import { listRecipientEmailsService, addRecipientEmailService, removeRecipientEmailService } from '../../../src/services/settings-emails.service.js';
import { getSchedulesService, updateSchedulesService } from '../../../src/services/settings-schedules.service.js';

vi.mock('../../../src/aws/ses.helper.js', () => ({
  verifyEmailIdentity: vi.fn().mockResolvedValue(undefined),
  deleteEmailIdentity: vi.fn().mockResolvedValue(undefined),
  getVerificationStatus: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../src/aws/eventbridge.helper.js', () => ({
  enableRule: vi.fn().mockResolvedValue(undefined),
  disableRule: vi.fn().mockResolvedValue(undefined),
}));

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

describe('settings.service (Integration - MySQL Testcontainers)', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('Recipient Emails Integration', () => {
    it('should add email to database', async () => {
      const logger = createDummyLogger();
      const result = await addRecipientEmailService('testuser@example.com', logger);

      expect(result.id).toBeDefined();
      expect(result.email).toBe('testuser@example.com');

      const emails = await listRecipientEmailsService(logger);
      expect(emails.length).toBe(1);
      expect(emails[0].email).toBe('testuser@example.com');
    });

    it('should remove email from database', async () => {
      const emailRecord = await createTestRecipientEmail({ email: 'delete-me@example.com' });
      const logger = createDummyLogger();

      await removeRecipientEmailService(emailRecord.id, logger);
      const emails = await listRecipientEmailsService(logger);
      expect(emails.find(e => e.id === emailRecord.id)).toBeUndefined();
    });
  });

  describe('Report Schedules Integration', () => {
    it('should fetch system_settings for schedules', async () => {
      const logger = createDummyLogger();
      const map = await getSchedulesService(logger);

      expect(map).toEqual({
        daily: true,
        weekly: true,
        monthly: true,
      });
    });

    it('should update system_settings in database', async () => {
      const logger = createDummyLogger();
      await updateSchedulesService({ daily: false, weekly: true, monthly: false }, logger);

      const updatedMap = await getSchedulesService(logger);
      expect(updatedMap).toEqual({
        daily: false,
        weekly: true,
        monthly: false,
      });
    });
  });
});
