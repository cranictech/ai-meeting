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

const updateItemSchema = z.object({
  task: z.string().optional(),
  assignee: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'overdue']).optional(),
});

router.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = updateItemSchema.parse(req.body);
    const updateData: any = {};
    if (data.task !== undefined) updateData.task = data.task;
    if (data.assignee !== undefined) updateData.assignee = data.assignee;
    if (data.dueDate !== undefined) updateData.due_date = data.dueDate ? new Date(data.dueDate) : null;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;

    const item = await actionItemRepo.update(req.params.id, updateData);
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    await actionItemRepo.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export { router as actionItemsRouter };
