import { Router } from 'express';
import { GoogleIntegrationService } from '../services/google-integration';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { Database, MeetingRepository } from '@meeting-ai/database';
import { config } from '../config';

const router = Router();
const googleService = new GoogleIntegrationService();
const db = new Database(config.database);
const meetingRepo = new MeetingRepository(db);

router.use(authenticate);

// Get integration status
router.get('/google/status', async (req: AuthRequest, res, next) => {
  try {
    const status = await googleService.getIntegrationStatus(req.userId!);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

// Save meeting notes to Google Drive
router.post('/google/drive/save', async (req: AuthRequest, res, next) => {
  try {
    const { meetingId, format } = req.body;

    if (!meetingId) {
      throw new AppError(400, 'Meeting ID is required');
    }

    const meeting = await meetingRepo.findById(meetingId);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    // Check if user has Drive scope
    const status = await googleService.getIntegrationStatus(req.userId!);
    if (!status.canUseDrive) {
      throw new AppError(400, 'Google Drive permission not granted. Please reconnect your Google account with Drive access.');
    }

    // Generate meeting notes content
    const [summary, actionItems, transcript] = await Promise.all([
      db.queryOne('SELECT * FROM meeting_summaries WHERE meeting_id = $1 ORDER BY created_at DESC LIMIT 1', [meetingId]),
      db.query('SELECT * FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC', [meetingId]),
      db.query('SELECT * FROM transcripts WHERE meeting_id = $1 ORDER BY start_time ASC', [meetingId]),
    ]);

    let content = `# ${meeting.title}\n\n`;
    content += `Date: ${new Date(meeting.created_at || Date.now()).toLocaleDateString()}\n`;
    content += `Duration: ${Math.round((meeting.duration_seconds || 0) / 60)} minutes\n\n`;

    if (summary?.executive_summary) {
      content += `## Executive Summary\n${summary.executive_summary}\n\n`;
    }
    if (summary?.summary) {
      content += `## Summary\n${summary.summary}\n\n`;
    }

    if (actionItems && actionItems.length > 0) {
      content += `## Action Items\n`;
      actionItems.forEach((item: any) => {
        const statusMark = item.status === 'completed' ? '[x]' : '[ ]';
        const assignee = item.assignee ? ` (${item.assignee})` : '';
        const due = item.due_date ? ` - Due: ${item.due_date}` : '';
        content += `${statusMark} ${item.task}${assignee}${due}\n`;
      });
      content += '\n';
    }

    if (transcript && transcript.length > 0) {
      content += `## Transcript\n`;
      transcript.forEach((t: any) => {
        content += `${t.speaker || 'Speaker'}: ${t.text}\n`;
      });
    }

    const webViewLink = await googleService.saveToDrive(
      req.userId!,
      meetingId,
      meeting.title,
      content,
      format || 'doc'
    );

    res.json({ success: true, webViewLink });
  } catch (error) {
    next(error);
  }
});

// Send meeting notes via Gmail
router.post('/google/gmail/send', async (req: AuthRequest, res, next) => {
  try {
    const { meetingId, recipients, subject, message } = req.body;

    if (!meetingId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new AppError(400, 'Meeting ID and recipients are required');
    }

    const meeting = await meetingRepo.findById(meetingId);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    // Check if user has Gmail scope
    const status = await googleService.getIntegrationStatus(req.userId!);
    if (!status.canUseGmail) {
      throw new AppError(400, 'Gmail permission not granted. Please reconnect your Google account with Gmail access.');
    }

    // Generate email content
    const [summary, actionItems] = await Promise.all([
      db.queryOne('SELECT * FROM meeting_summaries WHERE meeting_id = $1 ORDER BY created_at DESC LIMIT 1', [meetingId]),
      db.query('SELECT * FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC', [meetingId]),
    ]);

    let emailBody = message || `Here are the notes from ${meeting.title}:\n\n`;
    
    if (summary?.executive_summary) {
      emailBody += `Executive Summary:\n${summary.executive_summary}\n\n`;
    }
    if (summary?.summary) {
      emailBody += `Summary:\n${summary.summary}\n\n`;
    }

    if (actionItems && actionItems.length > 0) {
      emailBody += `Action Items:\n`;
      actionItems.forEach((item: any) => {
        const statusMark = item.status === 'completed' ? '[x]' : '[ ]';
        const assignee = item.assignee ? ` (${item.assignee})` : '';
        const due = item.due_date ? ` - Due: ${item.due_date}` : '';
        emailBody += `${statusMark} ${item.task}${assignee}${due}\n`;
      });
    }

    emailBody += `\n---\nPowered by Meeting AI`;

    await googleService.sendEmail(
      req.userId!,
      recipients,
      subject || `Meeting Notes: ${meeting.title}`,
      emailBody,
      meetingId
    );

    res.json({ success: true, recipients });
  } catch (error) {
    next(error);
  }
});

// Create calendar event for meeting
router.post('/google/calendar/create', async (req: AuthRequest, res, next) => {
  try {
    const { meetingId, title, description, startTime, endTime, attendees } = req.body;

    if (!meetingId || !startTime || !endTime) {
      throw new AppError(400, 'Meeting ID, start time, and end time are required');
    }

    const meeting = await meetingRepo.findById(meetingId);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    // Check if user has Calendar scope
    const status = await googleService.getIntegrationStatus(req.userId!);
    if (!status.canUseCalendar) {
      throw new AppError(400, 'Google Calendar permission not granted. Please reconnect your Google account with Calendar access.');
    }

    const htmlLink = await googleService.createCalendarEvent(
      req.userId!,
      meetingId,
      title || meeting.title,
      description || `Meeting notes for ${meeting.title}`,
      new Date(startTime),
      new Date(endTime),
      attendees
    );

    res.json({ success: true, htmlLink });
  } catch (error) {
    next(error);
  }
});

// Attach meeting notes to existing calendar event
router.post('/google/calendar/attach', async (req: AuthRequest, res, next) => {
  try {
    const { meetingId, calendarEventId } = req.body;

    if (!meetingId || !calendarEventId) {
      throw new AppError(400, 'Meeting ID and calendar event ID are required');
    }

    const meeting = await meetingRepo.findById(meetingId);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    // Check if user has Calendar scope
    const status = await googleService.getIntegrationStatus(req.userId!);
    if (!status.canUseCalendar) {
      throw new AppError(400, 'Google Calendar permission not granted. Please reconnect your Google account with Calendar access.');
    }

    // Generate notes content
    const [summary, actionItems] = await Promise.all([
      db.queryOne('SELECT * FROM meeting_summaries WHERE meeting_id = $1 ORDER BY created_at DESC LIMIT 1', [meetingId]),
      db.query('SELECT * FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC', [meetingId]),
    ]);

    let notes = `Meeting Notes: ${meeting.title}\n\n`;
    
    if (summary?.executive_summary) {
      notes += `Executive Summary:\n${summary.executive_summary}\n\n`;
    }
    if (summary?.summary) {
      notes += `Summary:\n${summary.summary}\n\n`;
    }

    if (actionItems && actionItems.length > 0) {
      notes += `Action Items:\n`;
      actionItems.forEach((item: any) => {
        const statusMark = item.status === 'completed' ? '[x]' : '[ ]';
        const assignee = item.assignee ? ` (${item.assignee})` : '';
        const due = item.due_date ? ` - Due: ${item.due_date}` : '';
        notes += `${statusMark} ${item.task}${assignee}${due}\n`;
      });
    }

    await googleService.attachNotesToCalendarEvent(
      req.userId!,
      meetingId,
      calendarEventId,
      notes
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export { router as integrationsRouter };
