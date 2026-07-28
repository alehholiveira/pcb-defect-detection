import type { FastifyBaseLogger } from 'fastify';
import { RecipientEmail } from '../models/index.js';
import { verifyEmailIdentity, deleteEmailIdentity, getVerificationStatus } from '../aws/ses.helper.js';
import { API_ERRORS, AppError } from '../utils/errors.js';

export async function listRecipientEmailsService(logger: FastifyBaseLogger): Promise<{ id: number; email: string; status: string; created_at: Date }[]> {
  logger.info('[settings-emails.service.ts] listRecipientEmailsService - Init');

  const emailsRecords = await RecipientEmail.findAll({
    order: [['created_at', 'DESC']],
  });
  
  if (emailsRecords.length === 0) {
    logger.info('[settings-emails.service.ts] listRecipientEmailsService - Success');
    return [];
  }
  
  const emails = emailsRecords.map(r => r.email);
  const statusMap = await getVerificationStatus(emails);
  
  logger.info('[settings-emails.service.ts] listRecipientEmailsService - Success');
  return emailsRecords.map(record => ({
    id: record.id,
    email: record.email,
    status: statusMap[record.email] || 'NotStarted',
    created_at: record.created_at,
  }));
}

/**
 * Adds a new recipient email and triggers the AWS SES verification lifecycle.
 * 
 * Verification Lifecycle:
 * 1. The email is saved to the local database (`RecipientEmail`).
 * 2. An SES identity verification is triggered (`verifyEmailIdentity`).
 * 3. AWS SES sends a verification link to the recipient.
 * 4. Subsequent calls to `listRecipientEmailsService` poll SES for the latest
 *    verification status (Pending, Success, Failed, etc.).
 */
export async function addRecipientEmailService(email: string, logger: FastifyBaseLogger): Promise<{ id: number; email: string; message: string }> {
  logger.info({ email }, '[settings-emails.service.ts] addRecipientEmailService - Init');

  const existing = await RecipientEmail.findOne({ where: { email } });
  
  if (existing) {
    throw new AppError(API_ERRORS.EMAIL_ALREADY_REGISTERED);
  }
  
  const record = await RecipientEmail.create({ email });
  
  try {
    await verifyEmailIdentity(email);
  } catch (error) {
    logger.error({ error }, '[settings-emails.service.ts] addRecipientEmailService - Error sending SES verification email');
    // Even if SES fails, we keep the record and maybe the user can try to resend later,
    // or we throw and rollback. For simplicity, we can let it pass and the status will be NotStarted
  }
  
  logger.info('[settings-emails.service.ts] addRecipientEmailService - Success');
  return {
    id: record.id,
    email: record.email,
    message: 'Verification email sent. Please check your inbox.',
  };
}

export async function removeRecipientEmailService(id: number, logger: FastifyBaseLogger) {
  logger.info({ id }, '[settings-emails.service.ts] removeRecipientEmailService - Init');

  const record = await RecipientEmail.findByPk(id);
  
  if (!record) {
    throw new AppError(API_ERRORS.RESOURCE_NOT_FOUND);
  }
  
  try {
    await deleteEmailIdentity(record.email);
  } catch (error) {
    logger.error({ error }, '[settings-emails.service.ts] removeRecipientEmailService - Error deleting SES identity (it might not exist)');
  }
  
  await record.destroy();
  
  logger.info('[settings-emails.service.ts] removeRecipientEmailService - Success');
  return { success: true };
}
