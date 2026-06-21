import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { env } from "../config/env";

const s3Client = new S3Client({ region: env.AWS_REGION });

/** Converte o body do GetObjectCommand para um Buffer do Node */
export async function streamToBuffer(stream: Readable | ReadableStream | Blob | any): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Retorna a lista de chaves JSON de inferência para uma determinada data/prefixo */
export async function listInferenceResultKeys(prefix: string): Promise<string[]> {
  const listCmd = new ListObjectsV2Command({
    Bucket: env.S3_BUCKET_NAME,
    Prefix: prefix,
  });
  const listRes = await s3Client.send(listCmd);
  
  if (!listRes.Contents) {
    return [];
  }

  return listRes.Contents
    .map(c => c.Key!)
    .filter(key => key.endsWith("result.json"));
}

/** Faz o download e parseia um arquivo JSON do S3 */
export async function getJsonFromS3<T>(key: string): Promise<T> {
  const getObj = await s3Client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }));
  const buf = await streamToBuffer(getObj.Body);
  return JSON.parse(buf.toString("utf-8")) as T;
}

/** Faz o download de uma imagem original do S3 */
export async function getImageBufferFromS3(key: string): Promise<Buffer> {
  const imgObj = await s3Client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }));
  return streamToBuffer(imgObj.Body);
}

/** Faz upload de um Buffer de PPTX para o S3 e retorna a URL pública */
export async function uploadPptxToS3(key: string, buffer: Buffer): Promise<string> {
  await s3Client.send(new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  }));
  
  return `https://${env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
}
