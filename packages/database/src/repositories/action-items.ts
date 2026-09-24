import { Database } from '../index';
import { ActionItem, MeetingSummary, MeetingDecision } from '../types';

export class ActionItemRepository {
  constructor(private db: Database) {}

  async create(meetingId: string, data: Partial<ActionItem>): Promise<ActionItem> {
    const result = await this.db.queryOne<ActionItem>(
      `INSERT INTO action_items 
       (meeting_id, task, assignee, assignee_user_id, due_date, priority, source_timestamp, confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        meetingId,
        data.task,
        data.assignee,
        data.assignee_user_id,
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

  async update(id: string, data: Partial<ActionItem>): Promise<ActionItem> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.task !== undefined) {
      fields.push(`task = $${idx++}`);
      values.push(data.task);
    }
    if (data.assignee !== undefined) {
      fields.push(`assignee = $${idx++}`);
      values.push(data.assignee);
    }
    if (data.due_date !== undefined) {
      fields.push(`due_date = $${idx++}`);
      values.push(data.due_date);
    }
    if (data.priority !== undefined) {
      fields.push(`priority = $${idx++}`);
      values.push(data.priority);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(data.status);
      if (data.status === 'completed') {
        fields.push(`completed_at = NOW()`);
      } else {
        fields.push(`completed_at = NULL`);
      }
    }

    if (fields.length === 0) {
      const existing = await this.db.queryOne<ActionItem>('SELECT * FROM action_items WHERE id = $1', [id]);
      if (!existing) throw new Error('Action item not found');
      return existing;
    }

    values.push(id);
    const result = await this.db.queryOne<ActionItem>(
      `UPDATE action_items SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (!result) throw new Error('Action item not found');
    return result;
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM action_items WHERE id = $1', [id]);
  }

  async getByMeeting(meetingId: string): Promise<ActionItem[]> {
    return this.db.query<ActionItem>(
      'SELECT * FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC',
      [meetingId]
    );
  }

  async getByUser(userId: string, status?: ActionItem['status']): Promise<(ActionItem & { meeting_title?: string })[]> {
    if (status) {
      return this.db.query<ActionItem & { meeting_title?: string }>(
        `SELECT ai.*, m.title as meeting_title 
         FROM action_items ai
         LEFT JOIN meetings m ON ai.meeting_id = m.id
         WHERE (ai.assignee_user_id = $1 OR m.user_id = $1)
           AND ai.status = $2
         ORDER BY COALESCE(ai.due_date, '9999-12-31') ASC, ai.created_at DESC`,
        [userId, status]
      );
    }
    return this.db.query<ActionItem & { meeting_title?: string }>(
      `SELECT ai.*, m.title as meeting_title 
       FROM action_items ai
       LEFT JOIN meetings m ON ai.meeting_id = m.id
       WHERE (ai.assignee_user_id = $1 OR m.user_id = $1)
       ORDER BY COALESCE(ai.due_date, '9999-12-31') ASC, ai.created_at DESC`,
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

  async getSummaryByMeeting(meetingId: string): Promise<MeetingSummary | null> {
    return this.db.queryOne<MeetingSummary>(
      'SELECT * FROM meeting_summaries WHERE meeting_id = $1 ORDER BY created_at DESC LIMIT 1',
      [meetingId]
    );
  }

  async getDecisionsByMeeting(meetingId: string): Promise<MeetingDecision[]> {
    return this.db.query<MeetingDecision>(
      'SELECT * FROM meeting_decisions WHERE meeting_id = $1 ORDER BY created_at ASC',
      [meetingId]
    );
  }
}

