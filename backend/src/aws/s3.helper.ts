import {GetObjectCommand, ListObjectsV2Command, S3Client} from '@aws-sdk/client-s3';
import {env} from '../config/index.js';
import {API_ERRORS} from '../utils/errors.js';

const s3Client = new S3Client({ region: env.AWS_REGION });

/** Converts a readable stream to a string */
async function streamToString(stream: any): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/** Lists all report metadata JSON keys in S3 */
export async function listReportMetadataKeys(): Promise<string[]> {
  const prefix = 'reports/';
  try {
    const listCmd = new ListObjectsV2Command({
      Bucket: env.S3_BUCKET_NAME,
      Prefix: prefix,
    });
    
    const listRes = await s3Client.send(listCmd);
    
    if (!listRes.Contents) {
      return [];
    }

    return listRes.Contents
        .map(c => c.Key as string)
        .filter(key => key && key.endsWith('.json'));
  } catch (error) {
    console.error('[s3.helper.ts] listReportMetadataKeys - Error', error);
    throw API_ERRORS.S3_OPERATION_FAILED;
  }
}

/** Downloads and parses a JSON file from S3 */
export async function getJsonFromS3<T>(key: string): Promise<T> {
  try {
    const getObj = await s3Client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }));
    const jsonStr = await streamToString(getObj.Body);
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.error(`[s3.helper.ts] getJsonFromS3 - Error fetching key ${key}`, error);
    throw API_ERRORS.S3_OPERATION_FAILED;
  }
}
