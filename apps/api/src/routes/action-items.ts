import { Router } from 'express';
import { z } from 'zod';
import { Database, ActionItemRepository } from '@meeting-ai/database';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const db = new Database(config.database);
const actionItemRepo = new ActionItemRepository(db);

router.use(authenticate);

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'overdue']),
});

router.get('/meeting/:meetingId', async (req: AuthRequest, res, next) => {
  try {
    const items = await actionItemRepo.getByMeeting(req.params.meetingId);
    res.json(items);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { meetingId, task, assignee, dueDate, priority } = req.body;
    
    const item = await actionItemRepo.create(meetingId, {
      task,
      assignee,
      assignee_user_id: req.userId,
      due_date: dueDate ? new Date(dueDate) : undefined,
      priority: priority || 'medium',
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

router.get('/user', async (req: AuthRequest, res, next) => {
  try {
    const status = req.query.status as any;
    const items = await actionItemRepo.getByUser(req.userId!, status);
    res.json(items);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req: AuthRequest, res, next) => {
  try {
    const { status } = updateStatusSchema.parse(req.body);
    await actionItemRepo.updateStatus(req.params.id, status);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export { router as actionItemsRouter };
