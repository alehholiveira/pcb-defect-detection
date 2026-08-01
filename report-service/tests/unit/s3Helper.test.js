import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { 
  listInferenceResultKeys, 
  getJsonFromS3, 
  getImageBufferFromS3, 
  uploadPptxToS3, 
  uploadJsonToS3 
} from '../../src/aws/s3Helper.js';
import { env } from '../../src/config/env.js';
import { LAMBDA_ERRORS } from '../../src/utils/errors.js';
import { Readable } from 'stream';

const s3Mock = mockClient(S3Client);

describe('s3Helper Unit Tests', () => {
  beforeEach(() => {
    s3Mock.reset();
    env.S3_BUCKET_NAME = 'test-bucket';
  });

  describe('listInferenceResultKeys', () => {
    it('should filter and return keys ending with result.json', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: [
          { Key: '2026-07-31/inf1/result.json' },
          { Key: '2026-07-31/inf1/image.png' },
          { Key: '2026-07-31/inf2/result.json' },
        ],
      });

      const keys = await listInferenceResultKeys('2026-07-31/');
      expect(keys).toEqual(['2026-07-31/inf1/result.json', '2026-07-31/inf2/result.json']);
    });

    it('should return an empty array if Contents is undefined', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({});

      const keys = await listInferenceResultKeys('2026-07-31/');
      expect(keys).toEqual([]);
    });

    it('should throw error when S3 list operation fails', async () => {
      s3Mock.on(ListObjectsV2Command).rejects(new Error('S3 Access Denied'));

      await expect(listInferenceResultKeys('2026-07-31/')).rejects.toThrow('S3 Access Denied');
    });
  });

  describe('getJsonFromS3', () => {
    it('should download and parse JSON correctly', async () => {
      const mockData = { test: true, count: 10 };
      const stream = Readable.from([Buffer.from(JSON.stringify(mockData))]);

      s3Mock.on(GetObjectCommand).resolves({
        Body: stream,
      });

      const data = await getJsonFromS3('2026-07-31/inf1/result.json');
      expect(data).toEqual(mockData);
    });

    it('should throw LAMBDA_ERRORS.S3_DOWNLOAD_FAILED on error', async () => {
      s3Mock.on(GetObjectCommand).rejects(new Error('File not found'));

      await expect(getJsonFromS3('invalid/key.json')).rejects.toEqual(LAMBDA_ERRORS.S3_DOWNLOAD_FAILED);
    });
  });

  describe('getImageBufferFromS3', () => {
    it('should download and return image buffer', async () => {
      const imgBuffer = Buffer.from('fake-image-bytes');
      const stream = Readable.from([imgBuffer]);

      s3Mock.on(GetObjectCommand).resolves({
        Body: stream,
      });

      const buffer = await getImageBufferFromS3('2026-07-31/inf1/image.png');
      expect(buffer.toString()).toBe('fake-image-bytes');
    });

    it('should throw LAMBDA_ERRORS.S3_DOWNLOAD_FAILED on error', async () => {
      s3Mock.on(GetObjectCommand).rejects(new Error('Network error'));

      await expect(getImageBufferFromS3('invalid/image.png')).rejects.toEqual(LAMBDA_ERRORS.S3_DOWNLOAD_FAILED);
    });
  });

  describe('uploadPptxToS3', () => {
    it('should upload buffer and return public S3 URL', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const url = await uploadPptxToS3('reports/test.pptx', Buffer.from('pptx-data'));
      expect(url).toBe('https://test-bucket.s3.amazonaws.com/reports/test.pptx');
    });
  });

  describe('uploadJsonToS3', () => {
    it('should upload JSON object as formatted string and return S3 URL', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const url = await uploadJsonToS3('reports/test.json', { reportName: 'Test' });
      expect(url).toBe('https://test-bucket.s3.amazonaws.com/reports/test.json');
    });
  });
});
