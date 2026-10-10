import crypto from 'crypto';
import { Database } from '@meeti/database';
import { config } from '../config';

const db = new Database(config.database);

const KEY_PREFIX = 'mai_';
const VALID_SCOPES = ['read', 'write', 'admin'] as const;
type Scope = (typeof VALID_SCOPES)[number];

// --- Narrow ISP interfaces ---

export interface ApiKeyWriter {
  create(
    userId: string,
    name: string,
    scopes?: Scope[],
    expiresAt?: Date
  ): Promise<{ key: string; id: string; name: string; key_prefix: string; scopes: Scope[]; expires_at: Date | null; created_at: string }>;
}

export interface ApiKeyReader {
  list(userId: string): Promise<any[]>;
}

export interface ApiKeyValidator {
  validate(rawKey: string): Promise<{ userId: string; scopes: Scope[] } | null>;
  revoke(userId: string, keyId: string): Promise<any>;
  hashKey(key: string): string;
  hasScope(scopes: Scope[], required: Scope): boolean;
}

export interface IApiKeyService extends ApiKeyWriter, ApiKeyReader, ApiKeyValidator {}

// --- Implementation ---

export class ApiKeyService implements IApiKeyService {
  generateKey(): { key: string; prefix: string; hash: string } {
    const raw = KEY_PREFIX + crypto.randomBytes(32).toString('hex');
    const prefix = raw.substring(0, 12);
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    return { key: raw, prefix, hash };
  }

  hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  async create(userId: string, name: string, scopes: Scope[] = ['read'], expiresAt?: Date) {
    const { key, prefix, hash } = this.generateKey();

    const record = await db.queryOne(
      `INSERT INTO api_keys (user_id, name, key_hash, key_prefix, scopes, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, key_prefix, scopes, expires_at, created_at`,
      [userId, name, hash, prefix, scopes, expiresAt ?? null]
    );

    return { ...record, key };
  }

  async list(userId: string) {
    return db.query(
      `SELECT id, name, key_prefix, scopes, last_used_at, expires_at, active, created_at
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  async revoke(userId: string, keyId: string) {
    const result = await db.queryOne(
      'UPDATE api_keys SET active = false WHERE id = $1 AND user_id = $2 RETURNING id',
      [keyId, userId]
    );
    if (!result) throw new Error('API key not found');
    return result;
  }

  async validate(rawKey: string): Promise<{ userId: string; scopes: Scope[] } | null> {
    const hash = this.hashKey(rawKey);
    const record = await db.queryOne(
      `SELECT user_id, scopes, expires_at, active
       FROM api_keys
       WHERE key_hash = $1`,
      [hash]
    );

    if (!record) return null;
    if (!record.active) return null;
    if (record.expires_at && new Date(record.expires_at) < new Date()) return null;

    await db.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1',
      [hash]
    );

    return { userId: record.user_id, scopes: record.scopes };
  }

  hasScope(scopes: Scope[], required: Scope): boolean {
    if (scopes.includes('admin')) return true;
    if (required === 'write' && scopes.includes('write')) return true;
    return scopes.includes(required);
  }
}

export const apiKeyService = new ApiKeyService();

