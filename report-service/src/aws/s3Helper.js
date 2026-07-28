import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Buffer } from "buffer";
import { env } from "../config/env.js";
import { LAMBDA_ERRORS } from "../utils/errors.js";

const s3Client = new S3Client({ region: env.AWS_REGION });

/** Converts the body of a GetObjectCommand to a Node Buffer */
export async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** 
 * Returns the list of inference JSON keys for a given date/prefix.
 * S3 key structure convention: {date}/{inferenceId}/result.json
 */
export async function listInferenceResultKeys(prefix) {
  console.log(`[s3Helper.js] listInferenceResultKeys - Init`, { prefix });
  try {
    const listCmd = new ListObjectsV2Command({
      Bucket: env.S3_BUCKET_NAME,
      Prefix: prefix,
    });
    const listRes = await s3Client.send(listCmd);
    
    if (!listRes.Contents) {
      console.log(`[s3Helper.js] listInferenceResultKeys - Success (0 resultados)`);
      return [];
    }

    const keys = listRes.Contents
      .map(c => c.Key)
      .filter(key => key.endsWith("result.json"));

    console.log(`[s3Helper.js] listInferenceResultKeys - Success`, { count: keys.length });
    return keys;
  } catch (error) {
    console.error(`[s3Helper.js] listInferenceResultKeys - Error`, error);
    throw error;
  }
}

/** 
 * Downloads and parses a JSON file from S3.
 * Error handling note: This function and getImageBufferFromS3 throw mapped LAMBDA_ERRORS,
 * while other functions (e.g., list/upload) re-throw the original AWS SDK errors.
 */
export async function getJsonFromS3(key) {
  console.log(`[s3Helper.js] getJsonFromS3 - Init`, { key });
  try {
    const getObj = await s3Client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }));
    const buf = await streamToBuffer(getObj.Body);
    console.log(`[s3Helper.js] getJsonFromS3 - Success`);
    return JSON.parse(buf.toString("utf-8"));
  } catch (error) {
    console.error(`[s3Helper.js] getJsonFromS3 - Error`, error);
    throw LAMBDA_ERRORS.S3_DOWNLOAD_FAILED;
  }
}

/** Downloads an original image from S3 and returns a Buffer */
export async function getImageBufferFromS3(key) {
  console.log(`[s3Helper.js] getImageBufferFromS3 - Init`, { key });
  try {
    const imgObj = await s3Client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }));
    const buffer = await streamToBuffer(imgObj.Body);
    console.log(`[s3Helper.js] getImageBufferFromS3 - Success`);
    return buffer;
  } catch (error) {
    console.error(`[s3Helper.js] getImageBufferFromS3 - Error`, error);
    throw LAMBDA_ERRORS.S3_DOWNLOAD_FAILED;
  }
}

/** 
 * Uploads a PPTX Buffer to S3 and returns the public URL.
 * Public URL construction assumes the bucket allows public access via: https://{bucket}.s3.amazonaws.com/{key}
 */
export async function uploadPptxToS3(key, buffer) {
  console.log(`[s3Helper.js] uploadPptxToS3 - Init`, { key, bufferSize: buffer.length });
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }));
    
    console.log(`[s3Helper.js] uploadPptxToS3 - Success`);
    return `https://${env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
  } catch (error) {
    console.error(`[s3Helper.js] uploadPptxToS3 - Error`, error);
    throw error;
  }
}

/** Uploads a JSON metadata object to S3 and returns the public URL */
export async function uploadJsonToS3(key, data) {
  console.log(`[s3Helper.js] uploadJsonToS3 - Init`, { key });
  try {
    const jsonString = JSON.stringify(data, null, 2);
    await s3Client.send(new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Body: jsonString,
      ContentType: "application/json",
    }));
    
    console.log(`[s3Helper.js] uploadJsonToS3 - Success`);
    return `https://${env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
  } catch (error) {
    console.error(`[s3Helper.js] uploadJsonToS3 - Error`, error);
    throw error;
  }
}
