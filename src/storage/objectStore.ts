/**
 * Object storage client (S3/R2 compatible)
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const S3_CONFIG = {
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
};

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client(S3_CONFIG);
  }
  return s3Client;
}

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'career-ops';

/**
 * Upload a file to object storage
 */
export async function uploadObject(
  key: string,
  body: Buffer | string,
  contentType?: string
): Promise<string> {
  const client = getS3Client();
  
  await client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  return key;
}

/**
 * Download a file from object storage
 */
export async function downloadObject(key: string): Promise<Buffer> {
  const client = getS3Client();
  
  const response = await client.send(new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  }));

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}

/**
 * Delete a file from object storage
 */
export async function deleteObject(key: string): Promise<void> {
  const client = getS3Client();
  
  await client.send(new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  }));
}

/**
 * Generate a presigned URL for direct upload/download
 * Note: Requires @aws-sdk/s3-request-presigner in production
 */
export async function generatePresignedUrl(
  key: string,
  expiresInSeconds: number = 3600,
  operation: 'get' | 'put' = 'get'
): Promise<string> {
  // Placeholder - implement with s3-request-presigner in production
  throw new Error('Presigned URLs not yet implemented');
}
