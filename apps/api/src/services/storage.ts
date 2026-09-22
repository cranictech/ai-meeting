import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export class StorageService {
  private s3: S3Client | null = null;
  private bucket: string;
  private useLocal: boolean;
  private localStoragePath: string;

  constructor() {
    this.bucket = config.storage.bucket;
    this.useLocal = config.storage.provider === 'local';
    this.localStoragePath = path.join(process.cwd(), 'uploads');
    
    if (!this.useLocal) {
      try {
        this.s3 = new S3Client({ region: config.storage.region });
      } catch (error) {
        console.warn('Failed to initialize S3 client, falling back to local storage');
        this.useLocal = true;
      }
    }

    if (this.useLocal && !fs.existsSync(this.localStoragePath)) {
      fs.mkdirSync(this.localStoragePath, { recursive: true });
    }
  }

  generateKey(userId: string, meetingId: string, filename: string): string {
    const hash = crypto.randomBytes(8).toString('hex');
    return `users/${userId}/meetings/${meetingId}/${hash}-${filename}`;
  }

  async uploadAudioChunk(
    userId: string,
    meetingId: string,
    chunkIndex: number,
    buffer: Buffer
  ): Promise<string> {
    const key = this.generateKey(userId, meetingId, `chunk-${chunkIndex}.webm`);

    if (this.useLocal) {
      const localPath = path.join(this.localStoragePath, key);
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(localPath, buffer);
      return key;
    }

    if (!this.s3) {
      throw new Error('S3 client not initialized');
    }

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'audio/webm',
      })
    );

    return key;
  }

  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (this.useLocal) {
      // For local storage, return a file:// URL or relative path
      const localPath = path.join(this.localStoragePath, key);
      if (fs.existsSync(localPath)) {
        return `file://${localPath}`;
      }
      throw new Error('File not found');
    }

    if (!this.s3) {
      throw new Error('S3 client not initialized');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async getSignedUploadUrl(
    userId: string,
    meetingId: string,
    filename: string,
    expiresIn: number = 3600
  ): Promise<{ url: string; key: string }> {
    const key = this.generateKey(userId, meetingId, filename);

    if (this.useLocal) {
      // For local storage, return a placeholder URL (client would need different handling)
      return { url: `local://${key}`, key };
    }

    if (!this.s3) {
      throw new Error('S3 client not initialized');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: 'audio/webm',
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn });

    return { url, key };
  }
}
