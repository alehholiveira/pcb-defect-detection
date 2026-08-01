import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { SESClient, ListIdentitiesCommand, GetIdentityVerificationAttributesCommand, SendEmailCommand } from '@aws-sdk/client-ses';
import { generateReport, generateManualReport } from '../../src/services/reportService.js';
import { env } from '../../src/config/env.js';
import { Readable } from 'stream';

const s3Mock = mockClient(S3Client);
const sesMock = mockClient(SESClient);

// 1x1 pixel PNG Buffer
const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

describe('reportService Integration Tests', () => {
  beforeEach(() => {
    s3Mock.reset();
    sesMock.reset();
    env.S3_BUCKET_NAME = 'pcb-reports-bucket';
    env.SENDER_EMAIL = 'sender@pcb.com';

    // Default SES mocks
    sesMock.on(ListIdentitiesCommand).resolves({ Identities: ['admin@pcb.com'] });
    sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
      VerificationAttributes: { 'admin@pcb.com': { VerificationStatus: 'Success' } },
    });
    sesMock.on(SendEmailCommand).resolves({ MessageId: 'msg-999' });
  });

  describe('generateReport (Automated)', () => {
    it('should generate report and upload pptx/json to S3 when inferences are found', async () => {
      const date = '2026-07-31';
      const inferenceResultKey = `${date}/inf-100/result.json`;
      const mockResultData = {
        total_detections: 2,
        images: [
          {
            image_name: 'board1.png',
            total_detections: 2,
            detections: [
              { class_name: 'missing_hole', confidence: 0.98, x1: 10, y1: 10, x2: 50, y2: 50 },
              { class_name: 'short', confidence: 0.95, x1: 60, y1: 60, x2: 100, y2: 100 },
            ],
          },
        ],
      };

      // Mock list keys
      s3Mock.on(ListObjectsV2Command, { Prefix: `${date}/` }).resolves({
        Contents: [{ Key: inferenceResultKey }],
      });

      // Mock get json and get image
      s3Mock.on(GetObjectCommand, { Key: inferenceResultKey }).resolves({
        Body: Readable.from([Buffer.from(JSON.stringify(mockResultData))]),
      });
      s3Mock.on(GetObjectCommand, { Key: `${date}/inf-100/board1.png` }).resolves({
        Body: Readable.from([TINY_PNG_BUFFER]),
      });

      // Mock put objects
      s3Mock.on(PutObjectCommand).resolves({});

      const resultMsg = await generateReport([date], 'daily');
      expect(resultMsg).toBe('Relatório processado com sucesso');

      // Verify PutObjectCommand was called for PPTX and JSON
      const putCalls = s3Mock.commandCalls(PutObjectCommand);
      expect(putCalls.length).toBe(2);

      const pptxCall = putCalls.find(call => call.args[0].input.Key.endsWith('.pptx'));
      const jsonCall = putCalls.find(call => call.args[0].input.Key.endsWith('.json'));

      expect(pptxCall).toBeDefined();
      expect(jsonCall).toBeDefined();

      const metadata = JSON.parse(jsonCall.args[0].input.Body);
      expect(metadata.totalInferences).toBe(1);
      expect(metadata.totalImages).toBe(1);
      expect(metadata.totalDefects).toBe(2);
      expect(metadata.defectsByType).toEqual({ missing_hole: 1, short: 1 });
    });

    it('should generate empty report when no inferences are found for target dates', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({});
      s3Mock.on(PutObjectCommand).resolves({});

      const resultMsg = await generateReport(['2026-07-30'], 'daily');
      expect(resultMsg).toBe('Relatório processado com sucesso');

      const putCalls = s3Mock.commandCalls(PutObjectCommand);
      expect(putCalls.length).toBe(2);
    });
  });

  describe('generateManualReport', () => {
    it('should process manual report request from inferences array', async () => {
      const inferences = [{ id: 'inf-200', date: '2026-07-31' }];
      const jsonKey = '2026-07-31/inf-200/result.json';
      const mockResultData = {
        total_detections: 1,
        images: [
          {
            image_name: 'pcb_layer.jpg',
            total_detections: 1,
            detections: [{ class_name: 'mouse_bite', confidence: 0.91, x1: 5, y1: 5, x2: 25, y2: 25 }],
          },
        ],
      };

      s3Mock.on(GetObjectCommand, { Key: jsonKey }).resolves({
        Body: Readable.from([Buffer.from(JSON.stringify(mockResultData))]),
      });
      s3Mock.on(GetObjectCommand, { Key: '2026-07-31/inf-200/pcb_layer.jpg' }).resolves({
        Body: Readable.from([TINY_PNG_BUFFER]),
      });

      s3Mock.on(PutObjectCommand).resolves({});

      const resultMsg = await generateManualReport(inferences, 'Relatório Customizado', 'user-123');
      expect(resultMsg).toBe('Relatório manual processado com sucesso');

      const putCalls = s3Mock.commandCalls(PutObjectCommand);
      expect(putCalls.length).toBe(2);

      const jsonCall = putCalls.find(call => call.args[0].input.Key.endsWith('.json'));
      const metadata = JSON.parse(jsonCall.args[0].input.Body);
      expect(metadata.reportName).toBe('Relatório Customizado');
      expect(metadata.generatedBy).toBe('user-123');
      expect(metadata.reportType).toBe('manual');
    });

    it('should return message when no valid inferences are found in manual request', async () => {
      s3Mock.on(GetObjectCommand).rejects(new Error('S3 error'));

      const resultMsg = await generateManualReport([{ id: '999', date: '2026-07-31' }], 'Relatório Vazio', 'user-123');
      expect(resultMsg).toBe('Nenhuma inferência processada');
    });
  });
});
