import { Router } from 'express';
import { z } from 'zod';
import {
  Database,
  Queryable,
  MeetingRepository,
  ActionItemRepository,
  IMeetingReader,
  IMeetingWriter,
  IMeetingLifecycle,
  IMeetingSearch,
  IMeetingSummaryStore,
} from '@meeti/database';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { getUsageService } from '../services/usage';
import { formatMinutesDeterministically, MEETING_TEMPLATES } from '../services/minutes';

const router = Router();
const db: Queryable = new Database(config.database);
const usage = getUsageService(db);
const meetingRepo: IMeetingReader & IMeetingWriter & IMeetingLifecycle & IMeetingSearch =
  new MeetingRepository(db);
const summaryStore: IMeetingSummaryStore = new ActionItemRepository(db);

router.use(authenticate);

// Ownership guard: another user's note returns 404.
async function ownNote(userId: string, id: string) {
  const meeting = await meetingRepo.findById(id);
  if (!meeting || meeting.user_id !== userId) {
    throw new AppError(404, 'Note not found');
  }
  return meeting;
}

const createSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  meetingType: z.string().optional(),
  outputLanguage: z.string().optional(),
  templateId: z.string().optional(),
  agenda: z.string().max(20000).optional(),
  objectives: z.string().max(20000).optional(),
  content: z.string().max(200000).optional(),
  meetingDate: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  participants: z
    .array(z.object({ name: z.string().min(1).max(255), email: z.string().email().optional(), role: z.string().optional() }))
    .optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  meetingType: z.string().optional(),
  outputLanguage: z.string().optional(),
  agenda: z.string().max(20000).nullable().optional(),
  objectives: z.string().max(20000).nullable().optional(),
  content: z.string().max(200000).nullable().optional(),
  meetingDate: z.string().datetime({ offset: true }).optional().nullable().or(z.literal('')),
});

// ---- Templates -------------------------------------------------------------
// Text scaffolding only; does not call any model.
router.get('/templates', async (req: AuthRequest, res, next) => {
  try {
    const plan = await usage.resolvePlan(req.userId!);
    const templates =
      plan.limits.templates === 'all'
        ? MEETING_TEMPLATES
        : MEETING_TEMPLATES.filter((t) => t.tier === 'basic');
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

// ---- List manual notes -----------------------------------------------------
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const notes = await db.query(
      `SELECT id, title, meeting_type, status, content, agenda, objectives,
              meeting_date, created_at, updated_at
       FROM meetings
       WHERE user_id = $1 AND content IS NOT NULL
       ORDER BY updated_at DESC
       LIMIT 200`,
      [req.userId]
    );
    res.json(notes);
  } catch (error) {
    next(error);
  }
});

// ---- Create ----------------------------------------------------------------
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = createSchema.parse(req.body);

    // Optional template prefill.
    let content = data.content ?? '';
    let agenda = data.agenda ?? '';
    let objectives = data.objectives ?? '';
    if (data.templateId) {
      const tpl = MEETING_TEMPLATES.find((t) => t.id === data.templateId);
      if (tpl) {
        if (!content) content = tpl.content;
        if (!agenda) agenda = tpl.agenda;
        if (!objectives) objectives = tpl.objectives;
      }
    }

    const meeting = await meetingRepo.create(req.userId!, {
      title: data.title,
      meeting_type: data.meetingType,
      output_language: data.outputLanguage,
      content,
      agenda,
      objectives,
      meeting_date: data.meetingDate ? new Date(data.meetingDate) : null,
      status: 'completed',
      metadata: { kind: 'manual_note', template_id: data.templateId || null },
    });

    for (const p of data.participants || []) {
      await db.query(
        `INSERT INTO meeting_participants (meeting_id, user_id, name, email, role)
         VALUES ($1, NULL, $2, $3, 'viewer')`,
        [meeting.id, p.name, p.email ?? null]
      );
    }

    res.status(201).json(meeting);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, error.errors[0]?.message || 'Invalid note'));
    }
    next(error);
  }
});

// ---- Read one --------------------------------------------------------------
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await ownNote(req.userId!, req.params.id);
    const [summary, participants] = await Promise.all([
      summaryStore.getSummaryByMeeting(req.params.id),
      db.query(
        'SELECT id, name, email, role FROM meeting_participants WHERE meeting_id = $1 ORDER BY added_at ASC',
        [req.params.id]
      ),
    ]);
    res.json({ ...meeting, manual_summary: summary, participants });
  } catch (error) {
    next(error);
  }
});

// ---- Update ----------------------------------------------------------------
router.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    await ownNote(req.userId!, req.params.id);
    const data = updateSchema.parse(req.body);
    const updated = await meetingRepo.update(req.params.id, {
      title: data.title,
      meeting_type: data.meetingType,
      output_language: data.outputLanguage,
      content: data.content ?? undefined,
      agenda: data.agenda ?? undefined,
      objectives: data.objectives ?? undefined,
      meeting_date: data.meetingDate ? new Date(data.meetingDate) : undefined,
    } as any);
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, error.errors[0]?.message || 'Invalid note'));
    }
    next(error);
  }
});

// ---- Delete ----------------------------------------------------------------
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    await ownNote(req.userId!, req.params.id);
    await meetingRepo.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ---- Participants ----------------------------------------------------------
const participantSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  role: z.string().optional(),
});

router.post('/:id/participants', async (req: AuthRequest, res, next) => {
  try {
    await ownNote(req.userId!, req.params.id);
    const p = participantSchema.parse(req.body);
    const row = await db.queryOne(
      `INSERT INTO meeting_participants (meeting_id, user_id, name, email, role)
       VALUES ($1, NULL, $2, $3, 'viewer') RETURNING id, name, email, role`,
      [req.params.id, p.name, p.email ?? null]
    );
    res.status(201).json(row);
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(400, 'Invalid participant'));
    next(error);
  }
});

router.delete('/:id/participants/:participantId', async (req: AuthRequest, res, next) => {
  try {
    await ownNote(req.userId!, req.params.id);
    await db.query(
      'DELETE FROM meeting_participants WHERE id = $1 AND meeting_id = $2',
      [req.params.participantId, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ---- Format into minutes (no model) ----------------------------------------
// Organizes typed text into sections with string rules and stores it as
// source='template'.
router.post('/:id/format', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await ownNote(req.userId!, req.params.id);
    const content = meeting.content || '';
    if (!content.trim()) {
      throw new AppError(400, 'Add some notes first — there is nothing to organize.');
    }

    const structured = formatMinutesDeterministically({
      content,
      agenda: meeting.agenda || '',
      objectives: meeting.objectives || '',
      title: meeting.title,
      meetingDate: meeting.meeting_date,
    });

    // Store the formatted minutes as the meeting summary.
    await summaryStore.createSummary(
      req.params.id,
      structured.markdown,
      structured.executiveSummary,
      undefined,
      structured.decisions,
      'template'
    );

    res.json({ source: 'template', structured });
  } catch (error) {
    next(error);
  }
});

// ---- Markdown export of manual notes ---------------------------------------
router.get('/:id/export/markdown', async (req: AuthRequest, res, next) => {
  try {
    const meeting = await ownNote(req.userId!, req.params.id);
    await usage.assertCanExport(req.userId!);
    const summary = await summaryStore.getSummaryByMeeting(req.params.id);
    const md = buildMarkdown(meeting, summary?.summary);
    await usage.meterExport(req.userId!, req.params.id, 'markdown');
    const safe = (meeting.title || 'meeting-notes').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safe}.md"`);
    res.send(md);
  } catch (error) {
    next(error);
  }
});

function buildMarkdown(meeting: any, formatted?: string): string {
  const lines: string[] = [];
  lines.push(`# ${meeting.title}`);
  if (meeting.meeting_date) lines.push(`_Meeting date: ${new Date(meeting.meeting_date).toLocaleString()}_`);
  lines.push(`_Created: ${new Date(meeting.created_at).toLocaleString()}_`, '');
  if (meeting.objectives) lines.push('## Objectives', meeting.objectives, '');
  if (meeting.agenda) lines.push('## Agenda', meeting.agenda, '');
  if (formatted) {
    lines.push('## Meeting minutes (formatted)', formatted, '');
    lines.push('> This structure was produced by template formatting, not AI.');
  } else if (meeting.content) {
    lines.push('## Notes', meeting.content, '');
  }
  return lines.join('\n');
}

export { router as notesRouter };
