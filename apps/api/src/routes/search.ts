import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Database } from '@meeti/database';
import { config } from '../config';

const router = Router();
const db = new Database(config.database);

router.use(authenticate);

// Full-text search across meetings, transcripts, summaries, action items
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { q, type, limit = '20', offset = '0' } = req.query as Record<string, string>;

    if (!q || q.trim().length < 2) {
      return res.json({ results: [], total: 0 });
    }

    const searchTerm = q.trim();
    const pageLimit = Math.min(parseInt(limit) || 20, 100);
    const pageOffset = parseInt(offset) || 0;

    // Normalise to tsquery
    const tsQuery = searchTerm.split(/\s+/).filter(Boolean).map(w => `${w}:*`).join(' & ');

    const rows = await db.query(
      `SELECT
         m.id,
         m.title,
         m.status,
         m.duration_seconds,
         m.created_at,
         ms.executive_summary as summary,
         ts_rank(si.document, to_tsquery('english', $2)) AS rank,
         ts_headline('english', m.title || ' ' || COALESCE(ms.executive_summary, ''), to_tsquery('english', $2),
                     'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=10') AS headline
       FROM meetings m
       JOIN search_index si ON si.meeting_id = m.id
       LEFT JOIN meeting_summaries ms ON ms.meeting_id = m.id
       WHERE si.user_id = $1
         AND si.document @@ to_tsquery('english', $2)
       ORDER BY rank DESC, m.created_at DESC
       LIMIT $3 OFFSET $4`,
      [req.userId, tsQuery, pageLimit, pageOffset]
    );

    const countRow = await db.queryOne(
      `SELECT COUNT(*) as total
       FROM meetings m
       JOIN search_index si ON si.meeting_id = m.id
       WHERE si.user_id = $1
         AND si.document @@ to_tsquery('english', $2)`,
      [req.userId, tsQuery]
    );

    res.json({
      results: rows,
      total: parseInt(countRow?.total ?? '0'),
      query: searchTerm,
      limit: pageLimit,
      offset: pageOffset,
    });
  } catch (error) {
    next(error);
  }
});

// Search action items only
router.get('/action-items', async (req: AuthRequest, res, next) => {
  try {
    const { q, status, limit = '20', offset = '0' } = req.query as Record<string, string>;
    const pageLimit = Math.min(parseInt(limit) || 20, 100);
    const pageOffset = parseInt(offset) || 0;

    let whereClause = 'WHERE ai.user_id = $1';
    const params: any[] = [req.userId];
    let paramIdx = 2;

    if (q && q.trim().length >= 2) {
      whereClause += ` AND ai.task ILIKE $${paramIdx}`;
      params.push(`%${q.trim()}%`);
      paramIdx++;
    }

    if (status) {
      whereClause += ` AND ai.status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    const rows = await db.query(
      `SELECT ai.*, m.title as meeting_title
       FROM action_items ai
       JOIN meetings m ON ai.meeting_id = m.id
       ${whereClause}
       ORDER BY ai.due_date ASC NULLS LAST, ai.created_at DESC
       LIMIT ${pageLimit} OFFSET ${pageOffset}`,
      params
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// Rebuild search index for a user's meetings (called after meeting processing)
router.post('/reindex', async (req: AuthRequest, res, next) => {
  try {
    const { meetingId } = req.body;

    if (meetingId) {
      // Reindex specific meeting
      const meeting = await db.queryOne(
        'SELECT * FROM meetings WHERE id = $1 AND user_id = $2',
        [meetingId, req.userId]
      );
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      await reindexMeeting(meetingId, req.userId!);
      return res.json({ success: true, indexed: 1 });
    }

    // Reindex all user meetings
    const meetings = await db.query(
      'SELECT id FROM meetings WHERE user_id = $1',
      [req.userId]
    );

    for (const m of meetings) {
      await reindexMeeting(m.id, req.userId!);
    }

    res.json({ success: true, indexed: meetings.length });
  } catch (error) {
    next(error);
  }
});

async function reindexMeeting(meetingId: string, userId: string) {
  const [meeting, summary, transcripts, actionItems] = await Promise.all([
    db.queryOne('SELECT title FROM meetings WHERE id = $1', [meetingId]),
    db.queryOne('SELECT summary, executive_summary FROM meeting_summaries WHERE meeting_id = $1', [meetingId]),
    db.query('SELECT text FROM transcripts WHERE meeting_id = $1', [meetingId]),
    db.query('SELECT task, assignee FROM action_items WHERE meeting_id = $1', [meetingId]),
  ]);

  const textParts = [
    meeting?.title ?? '',
    summary?.summary ?? '',
    summary?.executive_summary ?? '',
    ...transcripts.map((t: any) => t.text ?? ''),
    ...actionItems.map((a: any) => `${a.task ?? ''} ${a.assignee ?? ''}`),
  ].filter(Boolean).join(' ');

  await db.query(
    `INSERT INTO search_index (meeting_id, user_id, document)
     VALUES ($1, $2, to_tsvector('english', $3))
     ON CONFLICT (meeting_id) DO UPDATE
       SET document = to_tsvector('english', $3),
           updated_at = NOW()`,
    [meetingId, userId, textParts]
  );
}

export { router as searchRouter, reindexMeeting };
