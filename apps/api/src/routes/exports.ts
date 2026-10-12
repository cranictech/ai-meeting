import { Router } from 'express';
import { ExportService, PdfExporter, DocxExporter } from '../services/export';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { Database, Queryable, MeetingRepository, IMeetingReader } from '@meeti/database';
import { config } from '../config';
import { getUsageService } from '../services/usage';

const router = Router();
const pdfExporter: PdfExporter = new ExportService();
const docxExporter: DocxExporter = new ExportService();
const db: Queryable = new Database(config.database);
const usage = getUsageService(db);
const meetingReader: IMeetingReader = new MeetingRepository(db);

router.use(authenticate);

router.get('/meeting/:meetingId/pdf', async (req: AuthRequest, res, next) => {
  try {
    const { meetingId } = req.params;

    const meeting = await meetingReader.findById(meetingId);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    // Check export allowance, then meter the download.
    await usage.assertCanExport(req.userId!);

    const [summary, decisions, actionItems, transcript] = await Promise.all([
      db.queryOne('SELECT * FROM meeting_summaries WHERE meeting_id = $1 ORDER BY created_at DESC LIMIT 1', [meetingId]),
      db.query('SELECT * FROM meeting_decisions WHERE meeting_id = $1 ORDER BY created_at ASC', [meetingId]),
      db.query('SELECT * FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC', [meetingId]),
      db.query('SELECT * FROM transcripts WHERE meeting_id = $1 ORDER BY start_time ASC', [meetingId]),
    ]);

    const pdfBuffer = await pdfExporter.generatePDF(
      meeting,
      summary || {},
      decisions || [],
      actionItems || [],
      transcript || []
    );

    await usage.meterExport(req.userId!, meetingId, 'pdf');

    const safeTitle = (meeting.title || 'meeting-notes')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

router.get('/meeting/:meetingId/docx', async (req: AuthRequest, res, next) => {
  try {
    const { meetingId } = req.params;

    const meeting = await meetingReader.findById(meetingId);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    // Check export allowance, then meter the download.
    await usage.assertCanExport(req.userId!);

    const [summary, decisions, actionItems, transcript] = await Promise.all([
      db.queryOne('SELECT * FROM meeting_summaries WHERE meeting_id = $1 ORDER BY created_at DESC LIMIT 1', [meetingId]),
      db.query('SELECT * FROM meeting_decisions WHERE meeting_id = $1 ORDER BY created_at ASC', [meetingId]),
      db.query('SELECT * FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC', [meetingId]),
      db.query('SELECT * FROM transcripts WHERE meeting_id = $1 ORDER BY start_time ASC', [meetingId]),
    ]);

    const docxBuffer = await docxExporter.generateDOCX(
      meeting,
      summary || {},
      decisions || [],
      actionItems || [],
      transcript || []
    );

    await usage.meterExport(req.userId!, meetingId, 'docx');

    const safeTitle = (meeting.title || 'meeting-notes')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.docx"`);
    res.send(docxBuffer);
  } catch (error) {
    next(error);
  }
});

export { router as exportsRouter };
