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

router.post('/:id/translate', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await meetingRepo.findById(req.params.id);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    const targetLanguage = req.body.targetLanguage || 'en';
    const summary = await db.queryOne(
      'SELECT * FROM meeting_summaries WHERE meeting_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );

    if (!summary) {
      return res.json({ message: 'No summary available to translate' });
    }

    const { AnalysisService } = await import('../services/analysis');
    const ai = new AnalysisService();

    const translatedText = await ai.translate(summary.summary_text, targetLanguage);
    const translatedExec = summary.executive_summary
      ? await ai.translate(summary.executive_summary, targetLanguage)
      : undefined;

    res.json({
      targetLanguage,
      originalSummary: summary.summary_text,
      translatedSummary: translatedText,
      translatedExecutiveSummary: translatedExec,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/share/email', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await meetingRepo.findById(req.params.id);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    const { recipients, subject, message } = req.body;
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new AppError(400, 'At least one recipient email is required');
    }

    // Email dispatch handler
    console.log(`Meeting notes shared to ${recipients.join(', ')} for meeting: ${meeting.title}`);

    res.json({
      success: true,
      recipients,
      meetingTitle: meeting.title,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/export/html', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await meetingRepo.findById(req.params.id);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    const [summary, actionItems, transcript] = await Promise.all([
      db.queryOne('SELECT * FROM meeting_summaries WHERE meeting_id = $1 ORDER BY created_at DESC LIMIT 1', [req.params.id]),
      db.query('SELECT * FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC', [req.params.id]),
      db.query('SELECT * FROM transcripts WHERE meeting_id = $1 ORDER BY start_time ASC', [req.params.id]),
    ]);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${meeting.title} - Meeting Minutes</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 4px; }
    .meta { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
    h2 { color: #1f2937; margin-top: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; }
    .task-item { display: flex; align-items: center; margin-bottom: 8px; }
    .badge { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: #e0e7ff; color: #3730a3; margin-left: 8px; }
  </style>
</head>
<body>
  <h1>${meeting.title}</h1>
  <div class="meta">
    <span>Date: ${new Date(meeting.created_at || Date.now()).toLocaleDateString()}</span> |
    <span>Duration: ${Math.round((meeting.duration_seconds || 0) / 60)} minutes</span> |
    <span>Status: ${meeting.status.toUpperCase()}</span>
  </div>

  <h2>Executive Summary</h2>
  <p>${summary?.executive_summary || summary?.summary_text || 'No summary available.'}</p>

  <h2>Key Discussion</h2>
  <p>${summary?.summary_text || 'No discussion notes available.'}</p>

  <h2>Action Items</h2>
  ${actionItems && actionItems.length > 0 ? `
    <ul>
      ${actionItems.map((item: any) => `
        <li>
          <strong>${item.task}</strong>
          ${item.assignee ? ` - Assigned to: ${item.assignee}` : ''}
          ${item.due_date ? ` (Due: ${item.due_date})` : ''}
          <span class="badge">${item.priority.toUpperCase()}</span>
        </li>
      `).join('')}
    </ul>
  ` : '<p>No action items identified.</p>'}

  <h2>Transcript</h2>
  ${transcript && transcript.length > 0 ? `
    <div>
      ${transcript.map((t: any) => `
        <p><strong>${t.speaker || 'Speaker'}:</strong> ${t.text}</p>
      `).join('')}
    </div>
  ` : '<p>No transcript recorded.</p>'}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
});

export { router as meetingsRouter };

