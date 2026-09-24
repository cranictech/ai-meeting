import { Router } from 'express';
import { z } from 'zod';
import { Database, MeetingRepository } from '@meeting-ai/database';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { queueMeeting } from '../workers/process-meeting';

const router = Router();
const db = new Database(config.database);
const meetingRepo = new MeetingRepository(db);

router.use(authenticate);

const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  meetingType: z.string().optional(),
  outputLanguage: z.string().optional(),
});

const updateMeetingSchema = z.object({
  title: z.string().optional(),
  meetingType: z.string().optional(),
  outputLanguage: z.string().optional(),
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = createMeetingSchema.parse(req.body);
    const meeting = await meetingRepo.create(req.userId!, {
      title: data.title,
      meeting_type: data.meetingType,
      output_language: data.outputLanguage,
    });

    res.status(201).json(meeting);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const meetings = await meetingRepo.findByUserId(req.userId!);
    res.json(meetings);
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (req: AuthRequest, res, next) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query) {
      const allMeetings = await meetingRepo.findByUserId(req.userId!);
      return res.json(allMeetings);
    }
    const results = await meetingRepo.search(req.userId!, query);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await meetingRepo.findById(req.params.id);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }
    res.json(meeting);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await meetingRepo.findById(req.params.id);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    const data = updateMeetingSchema.parse(req.body);
    const updated = await meetingRepo.update(req.params.id, {
      title: data.title,
      meeting_type: data.meetingType,
      output_language: data.outputLanguage,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/start', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await meetingRepo.findById(req.params.id);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    await meetingRepo.startRecording(req.params.id);
    res.json({ status: 'recording' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/stop', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await meetingRepo.findById(req.params.id);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    await meetingRepo.stopRecording(req.params.id);
    await queueMeeting(req.params.id);

    res.json({ status: 'processing' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/process', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await meetingRepo.findById(req.params.id);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    await queueMeeting(req.params.id);
    res.json({ status: 'processing' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/summary', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await meetingRepo.findById(req.params.id);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    const summary = await db.queryOne(
      'SELECT * FROM meeting_summaries WHERE meeting_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );

    res.json(summary || {});
  } catch (error) {
    next(error);
  }
});

router.get('/:id/decisions', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await meetingRepo.findById(req.params.id);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    const decisions = await db.query(
      'SELECT * FROM meeting_decisions WHERE meeting_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );

    res.json(decisions);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await meetingRepo.findById(req.params.id);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    await meetingRepo.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/action-items', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await meetingRepo.findById(req.params.id);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    const actionItems = await db.query(
      'SELECT * FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );

    res.json(actionItems);
  } catch (error) {
    next(error);
  }
});

export { router as meetingsRouter };
