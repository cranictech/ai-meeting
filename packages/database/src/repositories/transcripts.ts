import { Database } from '../index';
import { Transcript, TranscriptSegment, Speaker } from '../types';

export class TranscriptRepository {
  constructor(private db: Database) {}

  async create(meetingId: string, provider: string): Promise<Transcript> {
    const result = await this.db.queryOne<Transcript>(
      'INSERT INTO transcripts (meeting_id, provider, status) VALUES ($1, $2, $3) RETURNING *',
      [meetingId, provider, 'pending']
    );
    if (!result) throw new Error('Failed to create transcript');
    return result;
  }

  async updateStatus(id: string, status: Transcript['status']): Promise<void> {
    await this.db.query(
      'UPDATE transcripts SET status = $1, completed_at = CASE WHEN $1 = $2 THEN NOW() ELSE completed_at END WHERE id = $3',
      [status, 'completed', id]
    );
  }

  async createSegment(data: Omit<TranscriptSegment, 'id'>): Promise<TranscriptSegment> {
    const result = await this.db.queryOne<TranscriptSegment>(
      `INSERT INTO transcript_segments 
       (transcript_id, segment_index, speaker_id, start_time, end_time, text, language, translated_text, confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        data.transcript_id,
        data.segment_index,
        data.speaker_id,
        data.start_time,
        data.end_time,
        data.text,
        data.language,
        data.translated_text,
        data.confidence
      ]
    );
    if (!result) throw new Error('Failed to create segment');
    return result;
  }

  async getSegments(transcriptId: string): Promise<TranscriptSegment[]> {
    return this.db.query<TranscriptSegment>(
      'SELECT * FROM transcript_segments WHERE transcript_id = $1 ORDER BY segment_index ASC',
      [transcriptId]
    );
  }

  async createSpeaker(meetingId: string, speakerLabel: string): Promise<Speaker> {
    const result = await this.db.queryOne<Speaker>(
      'INSERT INTO speakers (meeting_id, speaker_label) VALUES ($1, $2) RETURNING *',
      [meetingId, speakerLabel]
    );
    if (!result) throw new Error('Failed to create speaker');
    return result;
  }

  async updateSpeakerName(id: string, displayName: string): Promise<void> {
    await this.db.query('UPDATE speakers SET display_name = $1 WHERE id = $2', [displayName, id]);
  }

  async getSpeakers(meetingId: string): Promise<Speaker[]> {
    return this.db.query<Speaker>('SELECT * FROM speakers WHERE meeting_id = $1', [meetingId]);
  }
}
