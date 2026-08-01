import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { SESClient, ListIdentitiesCommand, GetIdentityVerificationAttributesCommand, SendEmailCommand } from '@aws-sdk/client-ses';
import { sendReportEmail } from '../../src/aws/sesHelper.js';
import { env } from '../../src/config/env.js';

const sesMock = mockClient(SESClient);

describe('sesHelper Unit Tests', () => {
  beforeEach(() => {
    sesMock.reset();
    env.SENDER_EMAIL = 'sender@example.com';
  });

  it('should send email when verified recipients exist', async () => {
    sesMock.on(ListIdentitiesCommand).resolves({
      Identities: ['sender@example.com', 'recipient@example.com'],
    });

    sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
      VerificationAttributes: {
        'sender@example.com': { VerificationStatus: 'Success' },
        'recipient@example.com': { VerificationStatus: 'Success' },
      },
    });

    sesMock.on(SendEmailCommand).resolves({ MessageId: 'msg-123' });

    const stats = { totalInferences: 5, totalImages: 10, totalDefects: 2 };
    await expect(sendReportEmail('31/07/2026', 'https://s3.url/report.pptx', stats, 'Relatório Diário')).resolves.not.toThrow();

    const sendCalls = sesMock.commandCalls(SendEmailCommand);
    expect(sendCalls.length).toBe(1);
    expect(sendCalls[0].args[0].input.Destination.ToAddresses).toEqual(['recipient@example.com']);
  });

  it('should skip sending email when no verified recipients are found', async () => {
    sesMock.on(ListIdentitiesCommand).resolves({
      Identities: ['sender@example.com'],
    });

    sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
      VerificationAttributes: {
        'sender@example.com': { VerificationStatus: 'Success' },
      },
    });

    const stats = { totalInferences: 0, totalImages: 0, totalDefects: 0 };
    await sendReportEmail('31/07/2026', 'https://s3.url/report.pptx', stats, 'Relatório Diário');

    const sendCalls = sesMock.commandCalls(SendEmailCommand);
    expect(sendCalls.length).toBe(0);
  });

  it('should handle SES error gracefully without throwing', async () => {
    sesMock.on(ListIdentitiesCommand).rejects(new Error('SES Service Unavailable'));

    const stats = { totalInferences: 1, totalImages: 1, totalDefects: 0 };
    await expect(sendReportEmail('31/07/2026', 'https://s3.url/report.pptx', stats, 'Relatório Diário')).resolves.not.toThrow();
  });
});
