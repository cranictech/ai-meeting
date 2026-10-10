import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { Database } from '@meeti/database';
import { config } from '../config';

const router = Router();
const db = new Database(config.database);

router.use(authenticate);

// List all tags
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const tags = await db.query(
      `SELECT t.*, COUNT(mt.meeting_id)::int as meeting_count
       FROM tags t
       LEFT JOIN meeting_tags mt ON mt.tag_id = t.id
       WHERE t.user_id = $1
       GROUP BY t.id
       ORDER BY t.name ASC`,
      [req.userId]
    );
    res.json(tags);
  } catch (error) {
    next(error);
  }
});

// Create tag
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name || name.trim().length === 0) throw new AppError(400, 'Name is required');

    const tag = await db.queryOne(
      'INSERT INTO tags (user_id, name, color) VALUES ($1, $2, $3) ON CONFLICT (user_id, name) DO UPDATE SET color = $3 RETURNING *',
      [req.userId, name.trim().toLowerCase(), color ?? null]
    );
    res.status(201).json(tag);
  } catch (error) {
    next(error);
  }
});

// Delete tag
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const result = await db.queryOne(
      'DELETE FROM tags WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (!result) throw new AppError(404, 'Tag not found');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Add tag to meeting
router.post('/meetings/:meetingId', async (req: AuthRequest, res, next) => {
  try {
    const { tagId, name, color } = req.body;

    const meeting = await db.queryOne('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [req.params.meetingId, req.userId]);
    if (!meeting) throw new AppError(404, 'Meeting not found');

    let resolvedTagId = tagId;
    if (!resolvedTagId && name) {
      const tag = await db.queryOne(
        'INSERT INTO tags (user_id, name, color) VALUES ($1, $2, $3) ON CONFLICT (user_id, name) DO UPDATE SET color = COALESCE($3, tags.color) RETURNING id',
        [req.userId, name.trim().toLowerCase(), color ?? null]
      );
      resolvedTagId = tag?.id;
    }

    if (!resolvedTagId) throw new AppError(400, 'tagId or name is required');

    await db.query(
      'INSERT INTO meeting_tags (meeting_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.meetingId, resolvedTagId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Remove tag from meeting
router.delete('/meetings/:meetingId/:tagId', async (req: AuthRequest, res, next) => {
  try {
    await db.query(
      'DELETE FROM meeting_tags WHERE meeting_id = $1 AND tag_id = $2',
      [req.params.meetingId, req.params.tagId]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get tags for a meeting
router.get('/meetings/:meetingId', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await db.queryOne('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [req.params.meetingId, req.userId]);
    if (!meeting) throw new AppError(404, 'Meeting not found');

    const tags = await db.query(
      `SELECT t.* FROM tags t
       JOIN meeting_tags mt ON mt.tag_id = t.id
       WHERE mt.meeting_id = $1`,
      [req.params.meetingId]
    );
    res.json(tags);
  } catch (error) {
    next(error);
  }
});

export { router as tagsRouter };
