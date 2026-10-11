import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface AudioChunkUploader {
  uploadAudioChunk(
    userId: string,
    meetingId: string,
    chunkIndex: number,
    buffer: Buffer
  ): Promise<string>;
}

export interface PresignedUploadSigner {
  getSignedUploadUrl(
    userId: string,
    meetingId: string,
    filename: string,
    expiresIn?: number
  ): Promise<{ url: string; key: string }>;
}

export interface FileDownloadUrlSigner {
  getSignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;
}

export interface IStorageService extends AudioChunkUploader, PresignedUploadSigner, FileDownloadUrlSigner {
  generateKey(userId: string, meetingId: string, filename: string): string;
  deleteByPrefix(prefix: string): Promise<number>;
}

export class StorageService implements IStorageService {
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

  /**
   * Delete every stored object under a key prefix (e.g. `users/<id>/`).
   * Used for meeting/account data removal so audio files do not linger in S3.
   * Returns the number of objects deleted.
   */
  async deleteByPrefix(prefix: string): Promise<number> {
    if (this.useLocal) {
      const dir = path.join(this.localStoragePath, prefix);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      return 0;
    }

    if (!this.s3) {
      throw new Error('S3 client not initialized');
    }

    let deleted = 0;
    let continuationToken: string | undefined;
    do {
      const list = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );
      const objects = (list.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => Boolean(k))
        .map((Key) => ({ Key }));

      if (objects.length > 0) {
        await this.s3.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: objects, Quiet: true },
          })
        );
        deleted += objects.length;
      }

      continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (continuationToken);

    return deleted;
  }
}
