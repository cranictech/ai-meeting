import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { Database } from '@meeti/database';
import { config } from '../config';

const router = Router();
const db = new Database(config.database);

router.use(authenticate);

// List folders
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const folders = await db.query(
      `SELECT f.*, COUNT(mf.meeting_id)::int as meeting_count
       FROM folders f
       LEFT JOIN meeting_folders mf ON mf.folder_id = f.id
       WHERE f.user_id = $1
       GROUP BY f.id
       ORDER BY f.name ASC`,
      [req.userId]
    );
    res.json(folders);
  } catch (error) {
    next(error);
  }
});

// Create folder
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { name, color, parentId } = req.body;
    if (!name || name.trim().length === 0) throw new AppError(400, 'Name is required');

    const folder = await db.queryOne(
      'INSERT INTO folders (user_id, name, color, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, name.trim(), color ?? null, parentId ?? null]
    );
    res.status(201).json(folder);
  } catch (error) {
    next(error);
  }
});

// Update folder
router.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { name, color } = req.body;
    const updated = await db.queryOne(
      `UPDATE folders
       SET name = COALESCE($3, name), color = COALESCE($4, color), updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.userId, name ?? null, color ?? null]
    );
    if (!updated) throw new AppError(404, 'Folder not found');
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete folder
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const result = await db.queryOne(
      'DELETE FROM folders WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (!result) throw new AppError(404, 'Folder not found');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// List meetings in folder
router.get('/:id/meetings', async (req: AuthRequest, res, next) => {
  try {
    const folder = await db.queryOne('SELECT * FROM folders WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!folder) throw new AppError(404, 'Folder not found');

    const meetings = await db.query(
      `SELECT m.id, m.title, m.status, m.duration_seconds, m.created_at
       FROM meetings m
       JOIN meeting_folders mf ON mf.meeting_id = m.id
       WHERE mf.folder_id = $1
       ORDER BY m.created_at DESC`,
      [req.params.id]
    );
    res.json(meetings);
  } catch (error) {
    next(error);
  }
});

// Add meeting to folder
router.post('/:id/meetings', async (req: AuthRequest, res, next) => {
  try {
    const { meetingId } = req.body;
    if (!meetingId) throw new AppError(400, 'meetingId is required');

    const folder = await db.queryOne('SELECT id FROM folders WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!folder) throw new AppError(404, 'Folder not found');

    const meeting = await db.queryOne('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [meetingId, req.userId]);
    if (!meeting) throw new AppError(404, 'Meeting not found');

    await db.query(
      'INSERT INTO meeting_folders (meeting_id, folder_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [meetingId, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Remove meeting from folder
router.delete('/:id/meetings/:meetingId', async (req: AuthRequest, res, next) => {
  try {
    await db.query(
      'DELETE FROM meeting_folders WHERE folder_id = $1 AND meeting_id = $2',
      [req.params.id, req.params.meetingId]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export { router as foldersRouter };
