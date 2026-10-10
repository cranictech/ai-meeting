/**
 * Public API v1 — accessed with API keys (Bearer mai_xxx)
 * Versioned prefix: /v1
 */
import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error-handler';
import { apiKeyService } from '../services/api-key';
import { Database } from '@meeti/database';
import { config } from '../config';

const router = Router();
const db = new Database(config.database);

// API Key authentication middleware
async function apiKeyAuth(req: Request & { userId?: string; apiScopes?: string[] }, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'API key required. Use: Authorization: Bearer mai_xxx'));
  }

  const key = authHeader.substring(7);
  if (!key.startsWith('mai_')) {
    return next(new AppError(401, 'Invalid API key format'));
  }

  const result = await apiKeyService.validate(key);
  if (!result) {
    return next(new AppError(401, 'Invalid or expired API key'));
  }

  req.userId = result.userId;
  req.apiScopes = result.scopes;
  next();
}

router.use(apiKeyAuth);

// GET /v1/meetings
router.get('/meetings', async (req: any, res, next) => {
  try {
    const { status, limit = '20', offset = '0', order = 'desc' } = req.query as Record<string, string>;
    const pageLimit = Math.min(parseInt(limit) || 20, 100);
    const pageOffset = parseInt(offset) || 0;
    const dir = order === 'asc' ? 'ASC' : 'DESC';

    let where = 'WHERE user_id = $1';
    const params: any[] = [req.userId];

    if (status) {
      params.push(status);
      where += ` AND status = $${params.length}`;
    }

    const meetings = await db.query(
      `SELECT id, title, status, duration_seconds, language, created_at, updated_at
       FROM meetings
       ${where}
       ORDER BY created_at ${dir}
       LIMIT ${pageLimit} OFFSET ${pageOffset}`,
      params
    );

    const countRow = await db.queryOne(`SELECT COUNT(*) as total FROM meetings ${where}`, params);

    res.json({
      data: meetings,
      meta: {
        total: parseInt(countRow?.total ?? '0'),
        limit: pageLimit,
        offset: pageOffset,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /v1/meetings/:id
router.get('/meetings/:id', async (req: any, res, next) => {
  try {
    const meeting = await db.queryOne(
      'SELECT id, title, status, duration_seconds, language, created_at, updated_at FROM meetings WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!meeting) throw new AppError(404, 'Meeting not found');
    res.json(meeting);
  } catch (error) {
    next(error);
  }
});

// GET /v1/meetings/:id/summary
router.get('/meetings/:id/summary', async (req: any, res, next) => {
  try {
    const meeting = await db.queryOne(
      'SELECT id FROM meetings WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!meeting) throw new AppError(404, 'Meeting not found');

    const summary = await db.queryOne(
      'SELECT * FROM meeting_summaries WHERE meeting_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );
    if (!summary) throw new AppError(404, 'Summary not yet available');
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// GET /v1/meetings/:id/transcript
router.get('/meetings/:id/transcript', async (req: any, res, next) => {
  try {
    const meeting = await db.queryOne(
      'SELECT id FROM meetings WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!meeting) throw new AppError(404, 'Meeting not found');

    const transcripts = await db.query(
      'SELECT * FROM transcripts WHERE meeting_id = $1 ORDER BY start_time ASC',
      [req.params.id]
    );
    res.json(transcripts);
  } catch (error) {
    next(error);
  }
});

// GET /v1/meetings/:id/action-items
router.get('/meetings/:id/action-items', async (req: any, res, next) => {
  try {
    const meeting = await db.queryOne(
      'SELECT id FROM meetings WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!meeting) throw new AppError(404, 'Meeting not found');

    const items = await db.query(
      'SELECT * FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(items);
  } catch (error) {
    next(error);
  }
});

// PATCH /v1/action-items/:id
router.patch('/action-items/:id', async (req: any, res, next) => {
  try {
    if (!apiKeyService.hasScope(req.apiScopes, 'write')) {
      throw new AppError(403, 'write scope required');
    }

    const { status, assignee, due_date } = req.body;
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      throw new AppError(400, `Invalid status. Allowed: ${validStatuses.join(', ')}`);
    }

    const updated = await db.queryOne(
      `UPDATE action_items
       SET status = COALESCE($3, status),
           assignee = COALESCE($4, assignee),
           due_date = COALESCE($5, due_date),
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.userId, status ?? null, assignee ?? null, due_date ?? null]
    );

    if (!updated) throw new AppError(404, 'Action item not found');
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// GET /v1/me
router.get('/me', async (req: any, res, next) => {
  try {
    const user = await db.queryOne(
      'SELECT id, email, full_name, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (!user) throw new AppError(404, 'User not found');
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export { router as publicApiRouter };
