import { Database } from '../index';
import { Meeting, Recording, AudioChunk } from '../types';

export class MeetingRepository {
  constructor(private db: Database) {}

  async create(userId: string, data: Partial<Meeting>): Promise<Meeting> {
    const result = await this.db.queryOne<Meeting>(
      `INSERT INTO meetings (user_id, title, meeting_type, output_language, recording_quality) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, data.title, data.meeting_type || 'business', data.output_language || 'en', data.recording_quality || 'standard']
    );
    if (!result) throw new Error('Failed to create meeting');
    return result;
  }

  async findById(id: string): Promise<Meeting | null> {
    return this.db.queryOne<Meeting>('SELECT * FROM meetings WHERE id = $1', [id]);
  }

  async findByUserId(userId: string, limit: number = 50): Promise<Meeting[]> {
    return this.db.query<Meeting>(
      'SELECT * FROM meetings WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
  }

  async updateStatus(id: string, status: Meeting['status']): Promise<void> {
    await this.db.query('UPDATE meetings SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
  }

  async startRecording(id: string): Promise<void> {
    await this.db.query(
      'UPDATE meetings SET status = $1, started_at = NOW(), updated_at = NOW() WHERE id = $2',
      ['recording', id]
    );
  }

  async stopRecording(id: string): Promise<void> {
    const meeting = await this.findById(id);
    if (meeting && meeting.started_at) {
      const startedAt = new Date(meeting.started_at);
      const endedAt = new Date();
      const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
      
      await this.db.query(
        `UPDATE meetings 
         SET status = $1, ended_at = NOW(), duration_seconds = $2, updated_at = NOW() 
         WHERE id = $3`,
        ['processing', durationSeconds, id]
      );
    } else {
      await this.db.query(
        'UPDATE meetings SET status = $1, ended_at = NOW(), updated_at = NOW() WHERE id = $2',
        ['processing', id]
      );
    }
  }

  async createRecording(meetingId: string, storagePath: string): Promise<Recording> {
    const result = await this.db.queryOne<Recording>(
      'INSERT INTO recordings (meeting_id, storage_path) VALUES ($1, $2) RETURNING *',
      [meetingId, storagePath]
    );
    if (!result) throw new Error('Failed to create recording');
    return result;
  }

  async createAudioChunk(recordingId: string, chunkIndex: number, storagePath: string): Promise<AudioChunk> {
    const result = await this.db.queryOne<AudioChunk>(
      'INSERT INTO audio_chunks (recording_id, chunk_index, storage_path) VALUES ($1, $2, $3) RETURNING *',
      [recordingId, chunkIndex, storagePath]
    );
    if (!result) throw new Error('Failed to create audio chunk');
    return result;
  }

  async getAudioChunks(recordingId: string): Promise<AudioChunk[]> {
    return this.db.query<AudioChunk>(
      'SELECT * FROM audio_chunks WHERE recording_id = $1 ORDER BY chunk_index ASC',
      [recordingId]
    );
  }

  async getRecordingByMeetingId(meetingId: string): Promise<Recording | null> {
    return this.db.queryOne<Recording>(
      'SELECT * FROM recordings WHERE meeting_id = $1 ORDER BY uploaded_at DESC LIMIT 1',
      [meetingId]
    );
  }

  async search(userId: string, term: string): Promise<Meeting[]> {
    const pattern = `%${term}%`;
    return this.db.query<Meeting>(
      `SELECT DISTINCT m.* 
       FROM meetings m
       LEFT JOIN meeting_summaries ms ON m.id = ms.meeting_id
       LEFT JOIN meeting_decisions md ON m.id = md.meeting_id
       LEFT JOIN action_items ai ON m.id = ai.meeting_id
       LEFT JOIN transcripts t ON m.id = t.meeting_id
       LEFT JOIN transcript_segments ts ON t.id = ts.transcript_id
       WHERE m.user_id = $1 AND (
         m.title ILIKE $2 OR
         m.meeting_type ILIKE $2 OR
         ms.summary ILIKE $2 OR
         ms.executive_summary ILIKE $2 OR
         md.decision ILIKE $2 OR
         ai.task ILIKE $2 OR
         ts.text ILIKE $2
       )
       ORDER BY m.created_at DESC LIMIT 50`,
      [userId, pattern]
    );
  }

  async update(id: string, data: Partial<Meeting>): Promise<Meeting> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(data.title);
    }
    if (data.meeting_type !== undefined) {
      fields.push(`meeting_type = $${idx++}`);
      values.push(data.meeting_type);
    }
    if (data.output_language !== undefined) {
      fields.push(`output_language = $${idx++}`);
      values.push(data.output_language);
    }
    if (data.duration_seconds !== undefined) {
      fields.push(`duration_seconds = $${idx++}`);
      values.push(data.duration_seconds);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE meetings SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await this.db.queryOne<Meeting>(query, values);
    if (!result) throw new Error('Meeting not found');
    return result;
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM meetings WHERE id = $1', [id]);
  }
}
