import { Router } from 'express';
import { StorageService } from '../services/storage';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Database, MeetingRepository } from '@meeting-ai/database';
import { config } from '../config';
import { AppError } from '../middleware/error-handler';
import { queueMeeting } from '../workers/process-meeting';
import * as multer from 'multer';

const router = Router();
const storageService = new StorageService();
const db = new Database(config.database);
const meetingRepo = new MeetingRepository(db);

// Configure multer for local file uploads
const upload = multer.default({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max
  },
});

router.use(authenticate);

router.post('/meeting/:meetingId/chunk', async (req: AuthRequest, res, next) => {
  try {
    const { meetingId } = req.params;
    const { chunkIndex } = req.body;

    const meeting = await meetingRepo.findById(meetingId);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    const { url, key } = await storageService.getSignedUploadUrl(
      req.userId!,
      meetingId,
      `chunk-${chunkIndex}.webm`
    );

    // If using local storage, client should upload directly to a different endpoint
    res.json({ uploadUrl: url, storageKey: key, useLocal: url.startsWith('local://') });
  } catch (error) {
    next(error);
  }
});

router.post('/meeting/:meetingId/chunk/complete', async (req: AuthRequest, res, next) => {
  try {
    const { meetingId } = req.params;
    const { chunkIndex, storageKey } = req.body;

    const meeting = await meetingRepo.findById(meetingId);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    // Get or create recording
    let recording = await db.queryOne<any>(
      'SELECT * FROM recordings WHERE meeting_id = $1',
      [meetingId]
    );

    if (!recording) {
      recording = await meetingRepo.createRecording(meetingId, storageKey);
    }

    await meetingRepo.createAudioChunk(recording.id, chunkIndex, storageKey);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Direct file upload endpoint for local storage
router.post('/meeting/:meetingId/chunk/direct', (req: any, res: any, next: any) => {
  upload.single('audio')(req, res, (err: any) => {
    if (err) return next(err);
    // Continue with the handler
    handleDirectUpload(req, res, next);
  });
});

async function handleDirectUpload(req: AuthRequest, res: any, next: any) {
  try {
    const { meetingId } = req.params;
    const { chunkIndex } = req.body;

    const meeting = await meetingRepo.findById(meetingId);
    if (!meeting) {
      throw new AppError(404, 'Meeting not found');
    }
    if (meeting.user_id !== req.userId) {
      throw new AppError(403, 'Access denied');
    }

    if (!req.file) {
      throw new AppError(400, 'No file uploaded');
    }

    const key = await storageService.uploadAudioChunk(
      req.userId!,
      meetingId,
      parseInt(chunkIndex),
      require('fs').readFileSync(req.file.path)
    );

    // Clean up temp file
    require('fs').unlinkSync(req.file.path);

    // Get or create recording
    let recording = await db.queryOne<any>(
      'SELECT * FROM recordings WHERE meeting_id = $1',
      [meetingId]
    );

    if (!recording) {
      recording = await meetingRepo.createRecording(meetingId, key);
    }

    await meetingRepo.createAudioChunk(recording.id, parseInt(chunkIndex), key);

    res.json({ success: true, storageKey: key });
  } catch (error) {
    next(error);
  }
}

// Single complete audio file upload - stores file, saves recording, triggers processing queue
router.post('/meeting/:meetingId/upload', (req: any, res: any, next: any) => {
  upload.single('audio')(req, res, (err: any) => {
    if (err) return next(err);
    handleFullUpload(req, res, next);
  });
});

async function handleFullUpload(req: AuthRequest, res: any, next: any) {
  const fs = require('fs');
  try {
    const { meetingId } = req.params;

    const meeting = await meetingRepo.findById(meetingId);
    if (!meeting) throw new AppError(404, 'Meeting not found');
    if (meeting.user_id !== req.userId) throw new AppError(403, 'Access denied');

    if (!req.file) throw new AppError(400, 'No audio file provided');

    const key = await storageService.uploadAudioChunk(
      req.userId!,
      meetingId,
      0,
      fs.readFileSync(req.file.path)
    );

    // Clean temp file
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    // Upsert recording record
    let recording = await db.queryOne<any>(
      'SELECT * FROM recordings WHERE meeting_id = $1',
      [meetingId]
    );
    if (!recording) {
      recording = await meetingRepo.createRecording(meetingId, key);
    } else {
      await db.query(
        'UPDATE recordings SET storage_path = $1, updated_at = NOW() WHERE id = $2',
        [key, recording.id]
      );
    }

    await meetingRepo.createAudioChunk(recording.id, 0, key);

    // Queue for processing
    await queueMeeting(meetingId);

    res.json({ success: true, storageKey: key });
  } catch (error) {
    next(error);
  }
}

export { router as uploadRouter };
