import { Router } from 'express';
import { Database, TranscriptRepository } from '@meeting-ai/database';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const db = new Database(config.database);
const transcriptRepo = new TranscriptRepository(db);

router.use(authenticate);

router.get('/meeting/:meetingId', async (req: AuthRequest, res, next) => {
  try {
    const transcript = await transcriptRepo.findByMeetingId(req.params.meetingId);
    res.json(transcript || {});
  } catch (error) {
    next(error);
  }
});

router.get('/meeting/:meetingId/segments', async (req: AuthRequest, res, next) => {
  try {
    const segments = await transcriptRepo.getSegmentsByMeetingId(req.params.meetingId);
    res.json(segments);
  } catch (error) {
    next(error);
  }
});

router.get('/meeting/:meetingId/speakers', async (req: AuthRequest, res, next) => {
  try {
    const speakers = await transcriptRepo.getSpeakers(req.params.meetingId);
    res.json(speakers);
  } catch (error) {
    next(error);
  }
});

router.patch('/speakers/:id', async (req: AuthRequest, res, next) => {
  try {
    await transcriptRepo.updateSpeakerName(req.params.id, req.body.displayName);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export { router as transcriptsRouter };
