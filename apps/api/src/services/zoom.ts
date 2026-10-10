import axios from 'axios';
import { Database, Queryable } from '@meeti/database';
import { config } from '../config';

const db: Queryable = new Database(config.database);

export interface ZoomIntegration {
  id: string;
  user_id: string;
  zoom_user_id?: string;
  account_id?: string;
  email?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ZoomRecordingItem {
  id: string;
  uuid: string;
  topic: string;
  start_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  download_url?: string;
  file_type?: string;
}

export interface IZoomService {
  getIntegration(userId: string): Promise<ZoomIntegration | null>;
  saveIntegration(userId: string, data: {
    zoomUserId?: string;
    accountId?: string;
    email?: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }): Promise<ZoomIntegration>;
  disconnect(userId: string): Promise<void>;
  getAuthUrl(redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<any>;
  listRecordings(userId: string): Promise<ZoomRecordingItem[]>;
}

export class ZoomService implements IZoomService {
  async getIntegration(userId: string): Promise<ZoomIntegration | null> {
    return db.queryOne<ZoomIntegration>(
      'SELECT * FROM zoom_integrations WHERE user_id = $1 AND active = true',
      [userId]
    );
  }

  async saveIntegration(userId: string, data: {
    zoomUserId?: string;
    accountId?: string;
    email?: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }): Promise<ZoomIntegration> {
    const expiresAt = data.expiresIn
      ? new Date(Date.now() + data.expiresIn * 1000).toISOString()
      : null;

    const existing = await this.getIntegration(userId);
    if (existing) {
      const updated = await db.queryOne<ZoomIntegration>(
        `UPDATE zoom_integrations
         SET zoom_user_id = COALESCE($2, zoom_user_id),
             account_id = COALESCE($3, account_id),
             email = COALESCE($4, email),
             access_token = $5,
             refresh_token = COALESCE($6, refresh_token),
             token_expires_at = COALESCE($7, token_expires_at),
             active = true,
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [userId, data.zoomUserId, data.accountId, data.email, data.accessToken, data.refreshToken, expiresAt]
      );
      return updated!;
    }

    const created = await db.queryOne<ZoomIntegration>(
      `INSERT INTO zoom_integrations
       (user_id, zoom_user_id, account_id, email, access_token, refresh_token, token_expires_at, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [userId, data.zoomUserId, data.accountId, data.email, data.accessToken, data.refreshToken, expiresAt]
    );
    return created!;
  }

  async disconnect(userId: string): Promise<void> {
    await db.query(
      'UPDATE zoom_integrations SET active = false, access_token = NULL, refresh_token = NULL WHERE user_id = $1',
      [userId]
    );
  }

  getAuthUrl(redirectUri: string): string {
    const clientId = process.env.ZOOM_CLIENT_ID || 'ZOOM_MOCK_CLIENT_ID';
    return `https://zoom.us/oauth/authorize?response_type=code&client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<any> {
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      // Mock mode for local development/testing
      return {
        access_token: `zoom_mock_token_${Date.now()}`,
        refresh_token: `zoom_mock_refresh_${Date.now()}`,
        expires_in: 3600,
        user_id: 'zoom_user_mock',
        email: 'user@zoom-workspace.com',
      };
    }

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        },
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data;
  }

  async listRecordings(userId: string): Promise<ZoomRecordingItem[]> {
    const integration = await this.getIntegration(userId);
    if (!integration || !integration.access_token) {
      return [];
    }

    // If using mock token or credentials aren't live yet
    if (integration.access_token.startsWith('zoom_mock_token_')) {
      return [
        {
          id: 'zoom_rec_001',
          uuid: 'uuid-rec-001',
          topic: 'Product Roadmap Sync',
          start_time: new Date(Date.now() - 3600000 * 24).toISOString(),
          duration: 45,
          total_size: 45000000,
          recording_count: 1,
          download_url: 'https://example.com/recording1.m4a',
          file_type: 'm4a',
        },
        {
          id: 'zoom_rec_002',
          uuid: 'uuid-rec-002',
          topic: 'Weekly Leadership Standup',
          start_time: new Date(Date.now() - 3600000 * 48).toISOString(),
          duration: 32,
          total_size: 32000000,
          recording_count: 1,
          download_url: 'https://example.com/recording2.m4a',
          file_type: 'm4a',
        },
      ];
    }

    try {
      const response = await axios.get('https://api.zoom.us/v2/users/me/recordings', {
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
        },
        params: {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      });

      const meetings = response.data?.meetings || [];
      return meetings.map((m: any) => ({
        id: m.id?.toString(),
        uuid: m.uuid,
        topic: m.topic || 'Untitled Zoom Meeting',
        start_time: m.start_time,
        duration: m.duration || 0,
        total_size: m.total_size || 0,
        recording_count: m.recording_count || 1,
        download_url: m.recording_files?.[0]?.download_url,
        file_type: m.recording_files?.[0]?.file_type || 'm4a',
      }));
    } catch (error: any) {
      console.warn('Failed to fetch Zoom recordings:', error?.response?.data || error?.message);
      return [];
    }
  }
}

export const zoomService = new ZoomService();
