import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// Cloudflare R2 is S3-compatible
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'mouva-templates';

/**
 * Upload a template to R2
 * @param userId User ID for path isolation
 * @param sessionId Session ID for unique key
 * @param templateData Template JSON object
 * @returns The R2 key for the uploaded object
 */
export async function uploadTemplate(
  userId: string,
  sessionId: string,
  templateData: object
): Promise<string> {
  const key = `users/${userId}/templates/${sessionId}.json`;
  
  await r2Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(templateData),
    ContentType: 'application/json',
  }));
  
  console.log(`[R2] Uploaded template: ${key}`);
  return key;
}

/**
 * Download a template from R2
 * @param key The R2 key returned from uploadTemplate
 * @returns The template object or null if not found
 */
export async function downloadTemplate(key: string): Promise<object | null> {
  try {
    const response = await r2Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));
    
    if (!response.Body) return null;
    
    // Convert stream to string
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks).toString('utf-8');
    
    return JSON.parse(body);
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

/**
 * Delete a template from R2
 * @param key The R2 key to delete
 */
export async function deleteTemplate(key: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  }));
  console.log(`[R2] Deleted template: ${key}`);
}

export default r2Client;
