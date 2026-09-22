import { Database } from '../index';
import { User, Profile } from '../types';

export class UserRepository {
  constructor(private db: Database) {}

  async create(email: string, passwordHash?: string): Promise<User> {
    const result = await this.db.queryOne<User>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      [email, passwordHash]
    );
    if (!result) throw new Error('Failed to create user');
    return result;
  }

  async findById(id: string): Promise<User | null> {
    return this.db.queryOne<User>('SELECT * FROM users WHERE id = $1', [id]);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.queryOne<User>('SELECT * FROM users WHERE email = $1', [email]);
  }

  async updateLastActive(id: string): Promise<void> {
    await this.db.query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [id]);
  }

  async createProfile(userId: string, profile: Partial<Profile>): Promise<Profile> {
    const result = await this.db.queryOne<Profile>(
      `INSERT INTO profiles (user_id, full_name, country, timezone, preferred_language, output_language, date_format, time_format, use_case) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        userId,
        profile.full_name,
        profile.country,
        profile.timezone,
        profile.preferred_language || 'en',
        profile.output_language || 'en',
        profile.date_format || 'YYYY-MM-DD',
        profile.time_format || '24h',
        profile.use_case
      ]
    );
    if (!result) throw new Error('Failed to create profile');
    return result;
  }

  async getProfile(userId: string): Promise<Profile | null> {
    return this.db.queryOne<Profile>('SELECT * FROM profiles WHERE user_id = $1', [userId]);
  }

  async updateProfile(userId: string, profile: Partial<Profile>): Promise<Profile> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (profile.full_name !== undefined) {
      updateFields.push(`full_name = $${paramIndex++}`);
      values.push(profile.full_name);
    }
    if (profile.country !== undefined) {
      updateFields.push(`country = $${paramIndex++}`);
      values.push(profile.country);
    }
    if (profile.timezone !== undefined) {
      updateFields.push(`timezone = $${paramIndex++}`);
      values.push(profile.timezone);
    }
    if (profile.preferred_language !== undefined) {
      updateFields.push(`preferred_language = $${paramIndex++}`);
      values.push(profile.preferred_language);
    }
    if (profile.output_language !== undefined) {
      updateFields.push(`output_language = $${paramIndex++}`);
      values.push(profile.output_language);
    }
    if (profile.date_format !== undefined) {
      updateFields.push(`date_format = $${paramIndex++}`);
      values.push(profile.date_format);
    }
    if (profile.time_format !== undefined) {
      updateFields.push(`time_format = $${paramIndex++}`);
      values.push(profile.time_format);
    }
    if (profile.profile_photo_url !== undefined) {
      updateFields.push(`profile_photo_url = $${paramIndex++}`);
      values.push(profile.profile_photo_url);
    }
    if (profile.use_case !== undefined) {
      updateFields.push(`use_case = $${paramIndex++}`);
      values.push(profile.use_case);
    }

    if (updateFields.length === 0) {
      return this.getProfile(userId) as Promise<Profile>;
    }

    values.push(userId);

    const result = await this.db.queryOne<Profile>(
      `UPDATE profiles 
       SET ${updateFields.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );
    if (!result) throw new Error('Failed to update profile');
    return result;
  }
}
