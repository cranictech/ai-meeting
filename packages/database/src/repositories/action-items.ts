import { Database } from '../index';
import { ActionItem, MeetingSummary, MeetingDecision } from '../types';

export class ActionItemRepository {
  constructor(private db: Database) {}

  async create(meetingId: string, data: Partial<ActionItem>): Promise<ActionItem> {
    const result = await this.db.queryOne<ActionItem>(
      `INSERT INTO action_items 
       (meeting_id, task, assignee, due_date, priority, source_timestamp, confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        meetingId,
        data.task,
        data.assignee,
        data.due_date,
        data.priority || 'medium',
        data.source_timestamp,
        data.confidence || 'high'
      ]
    );
    if (!result) throw new Error('Failed to create action item');
    return result;
  }

  async updateStatus(id: string, status: ActionItem['status']): Promise<void> {
    await this.db.query(
      'UPDATE action_items SET status = $1, completed_at = CASE WHEN $1 = $2 THEN NOW() ELSE NULL END WHERE id = $3',
      [status, 'completed', id]
    );
  }

  async getByMeeting(meetingId: string): Promise<ActionItem[]> {
    return this.db.query<ActionItem>(
      'SELECT * FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC',
      [meetingId]
    );
  }

  async getByUser(userId: string, status?: ActionItem['status']): Promise<ActionItem[]> {
    if (status) {
      return this.db.query<ActionItem>(
        'SELECT * FROM action_items WHERE assignee_user_id = $1 AND status = $2 ORDER BY due_date ASC',
        [userId, status]
      );
    }
    return this.db.query<ActionItem>(
      'SELECT * FROM action_items WHERE assignee_user_id = $1 ORDER BY due_date ASC',
      [userId]
    );
  }

  async createSummary(meetingId: string, summary: string, executiveSummary?: string): Promise<MeetingSummary> {
    const result = await this.db.queryOne<MeetingSummary>(
      'INSERT INTO meeting_summaries (meeting_id, summary, executive_summary) VALUES ($1, $2, $3) RETURNING *',
      [meetingId, summary, executiveSummary]
    );
    if (!result) throw new Error('Failed to create summary');
    return result;
  }

  async createDecision(meetingId: string, decision: string, sourceTimestamp?: number): Promise<MeetingDecision> {
    const result = await this.db.queryOne<MeetingDecision>(
      'INSERT INTO meeting_decisions (meeting_id, decision, source_timestamp) VALUES ($1, $2, $3) RETURNING *',
      [meetingId, decision, sourceTimestamp]
    );
    if (!result) throw new Error('Failed to create decision');
    return result;
  }
}
