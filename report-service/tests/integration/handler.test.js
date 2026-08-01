import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { SESClient, ListIdentitiesCommand, GetIdentityVerificationAttributesCommand, SendEmailCommand } from '@aws-sdk/client-ses';
import { handler } from '../../src/index.js';
import { env } from '../../src/config/env.js';
import { LAMBDA_ERRORS } from '../../src/utils/errors.js';
import { Readable } from 'stream';

const s3Mock = mockClient(S3Client);
const sesMock = mockClient(SESClient);

const dummyContext = { awsRequestId: 'req-12345' };

describe('Lambda Handler Integration Tests', () => {
  beforeEach(() => {
    s3Mock.reset();
    sesMock.reset();
    env.S3_BUCKET_NAME = 'pcb-bucket';
    env.SENDER_EMAIL = 'sender@pcb.com';

    sesMock.on(ListIdentitiesCommand).resolves({ Identities: ['admin@pcb.com'] });
    sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
      VerificationAttributes: { 'admin@pcb.com': { VerificationStatus: 'Success' } },
    });
    sesMock.on(SendEmailCommand).resolves({});
    s3Mock.on(ListObjectsV2Command).resolves({});
    s3Mock.on(PutObjectCommand).resolves({});
  });

  describe('SQS Manual Report Trigger', () => {
    it('should process SQS message successfully', async () => {
      const sqsEvent = {
        Records: [
          {
            messageId: 'msg-1',
            body: JSON.stringify({
              inferences: [{ id: 'inf-1', date: '2026-07-31' }],
              report_name: 'Manual Test Report',
              requested_by: 'tester',
            }),
          },
        ],
      };

      const resultData = {
        total_detections: 0,
        images: [],
      };
      s3Mock.on(GetObjectCommand).resolves({
        Body: Readable.from([Buffer.from(JSON.stringify(resultData))]),
      });

      const response = await handler(sqsEvent, dummyContext);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Relatórios manuais processados');
    });

    it('should return error response for invalid SQS payload (missing inferences)', async () => {
      const invalidSqsEvent = {
        Records: [
          {
            messageId: 'msg-bad',
            body: JSON.stringify({ report_name: 'Invalid Report' }),
          },
        ],
      };

      const response = await handler(invalidSqsEvent, dummyContext);
      expect(response.statusCode).toBe(LAMBDA_ERRORS.SQS_PAYLOAD_INVALID.statusCode);
      const body = JSON.parse(response.body);
      expect(body.code).toBe(LAMBDA_ERRORS.SQS_PAYLOAD_INVALID.code);
    });

    it('should return error response for invalid SQS payload (missing report_name)', async () => {
      const invalidSqsEvent = {
        Records: [
          {
            messageId: 'msg-bad',
            body: JSON.stringify({ inferences: [{ id: '1', date: '2026-07-31' }] }),
          },
        ],
      };

      const response = await handler(invalidSqsEvent, dummyContext);
      expect(response.statusCode).toBe(LAMBDA_ERRORS.SQS_PAYLOAD_INVALID.statusCode);
    });
  });

  describe('EventBridge Scheduled Trigger', () => {
    it('should process daily scheduled report trigger', async () => {
      const scheduledEvent = {
        trigger_type: 'scheduled',
        report_type: 'daily',
      };

      const response = await handler(scheduledEvent, dummyContext);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Relatório processado com sucesso');
    });

    it('should process weekly scheduled report trigger', async () => {
      const scheduledEvent = {
        trigger_type: 'scheduled',
        report_type: 'weekly',
      };

      const response = await handler(scheduledEvent, dummyContext);
      expect(response.statusCode).toBe(200);
    });

    it('should process monthly scheduled report trigger', async () => {
      const scheduledEvent = {
        trigger_type: 'scheduled',
        report_type: 'monthly',
      };

      const response = await handler(scheduledEvent, dummyContext);
      expect(response.statusCode).toBe(200);
    });

    it('should return error response for invalid report_type', async () => {
      const invalidScheduledEvent = {
        trigger_type: 'scheduled',
        report_type: 'yearly',
      };

      const response = await handler(invalidScheduledEvent, dummyContext);
      expect(response.statusCode).toBe(LAMBDA_ERRORS.INVALID_REPORT_TYPE.statusCode);
      const body = JSON.parse(response.body);
      expect(body.code).toBe(LAMBDA_ERRORS.INVALID_REPORT_TYPE.code);
    });
  });

  describe('Unrecognized & Environment Errors', () => {
    it('should return 400 for unknown event structure', async () => {
      const unknownEvent = { foo: 'bar' };

      const response = await handler(unknownEvent, dummyContext);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe(LAMBDA_ERRORS.EVENT_NOT_RECOGNIZED.code);
    });

    it('should return error response when environment variables are missing', async () => {
      env.S3_BUCKET_NAME = '';

      const scheduledEvent = { trigger_type: 'scheduled', report_type: 'daily' };
      const response = await handler(scheduledEvent, dummyContext);

      expect(response.statusCode).toBe(LAMBDA_ERRORS.MISSING_ENV_VARS.statusCode);
      const body = JSON.parse(response.body);
      expect(body.code).toBe(LAMBDA_ERRORS.MISSING_ENV_VARS.code);
    });
  });
});
