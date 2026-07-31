import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockRecipientEmail,
  mockSystemSetting,
  mockVerifyEmailIdentity,
  mockDeleteEmailIdentity,
  mockGetVerificationStatus,
  mockEnableRule,
  mockDisableRule,
} = vi.hoisted(() => ({
  mockRecipientEmail: {
    findAll: vi.fn(),
    findOne: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
  },
  mockSystemSetting: {
    findAll: vi.fn(),
    update: vi.fn(),
  },
  mockVerifyEmailIdentity: vi.fn().mockResolvedValue(undefined),
  mockDeleteEmailIdentity: vi.fn().mockResolvedValue(undefined),
  mockGetVerificationStatus: vi.fn().mockResolvedValue({}),
  mockEnableRule: vi.fn().mockResolvedValue(undefined),
  mockDisableRule: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/models/index.js', () => ({
  RecipientEmail: mockRecipientEmail,
  SystemSetting: mockSystemSetting,
}));

vi.mock('../../../src/aws/ses.helper.js', () => ({
  verifyEmailIdentity: (email: string) => mockVerifyEmailIdentity(email),
  deleteEmailIdentity: (email: string) => mockDeleteEmailIdentity(email),
  getVerificationStatus: (emails: string[]) => mockGetVerificationStatus(emails),
}));

vi.mock('../../../src/aws/eventbridge.helper.js', () => ({
  enableRule: (name: string) => mockEnableRule(name),
  disableRule: (name: string) => mockDisableRule(name),
}));

import { listRecipientEmailsService, addRecipientEmailService, removeRecipientEmailService } from '../../../src/services/settings-emails.service.js';
import { getSchedulesService, updateSchedulesService } from '../../../src/services/settings-schedules.service.js';

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

describe('Settings Services (Unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('settings-emails.service', () => {
    it('should list recipient emails with SES verification status', async () => {
      const dummyRecords = [
        { id: 1, email: 'a@example.com', created_at: new Date() },
        { id: 2, email: 'b@example.com', created_at: new Date() },
      ];
      mockRecipientEmail.findAll.mockResolvedValue(dummyRecords);
      mockGetVerificationStatus.mockResolvedValue({
        'a@example.com': 'Success',
        'b@example.com': 'Pending',
      });

      const logger = createDummyLogger();
      const result = await listRecipientEmailsService(logger);

      expect(result.length).toBe(2);
      expect(result[0].status).toBe('Success');
      expect(result[1].status).toBe('Pending');
    });

    it('should throw AppError if adding email that already exists', async () => {
      mockRecipientEmail.findOne.mockResolvedValue({ id: 1, email: 'exist@example.com' });

      const logger = createDummyLogger();
      await expect(addRecipientEmailService('exist@example.com', logger)).rejects.toThrow('Este e-mail já está cadastrado.');
    });

    it('should add email and trigger SES verification when email is new', async () => {
      mockRecipientEmail.findOne.mockResolvedValue(null);
      mockRecipientEmail.create.mockResolvedValue({ id: 10, email: 'new@example.com' });

      const logger = createDummyLogger();
      const result = await addRecipientEmailService('new@example.com', logger);

      expect(result.id).toBe(10);
      expect(result.email).toBe('new@example.com');
      expect(mockVerifyEmailIdentity).toHaveBeenCalledWith('new@example.com');
    });
  });

  describe('settings-schedules.service', () => {
    it('should return schedule settings map', async () => {
      mockSystemSetting.findAll.mockResolvedValue([
        { key: 'report_schedule_daily', value: 'true' },
        { key: 'report_schedule_weekly', value: 'false' },
        { key: 'report_schedule_monthly', value: 'true' },
      ]);

      const logger = createDummyLogger();
      const map = await getSchedulesService(logger);

      expect(map).toEqual({
        daily: true,
        weekly: false,
        monthly: true,
      });
    });

    it('should update schedules in DB and toggle EventBridge rules', async () => {
      mockSystemSetting.update.mockResolvedValue([1]);

      const logger = createDummyLogger();
      const input = { daily: true, weekly: false, monthly: true };
      const result = await updateSchedulesService(input, logger);

      expect(result).toEqual(input);
      expect(mockSystemSetting.update).toHaveBeenCalledTimes(3);
      expect(mockEnableRule).toHaveBeenCalledTimes(2); // daily & monthly
      expect(mockDisableRule).toHaveBeenCalledTimes(1); // weekly
    });
  });
});
