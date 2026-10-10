import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { zoomService } from '../services/zoom';
import { Database, MeetingRepository, Queryable } from '@meeti/database';
import { config } from '../config';
import { queueMeeting } from '../workers/process-meeting';

const router = Router();
const db: Queryable = new Database(config.database);
const meetingRepo = new MeetingRepository(db);

router.use(authenticate);

// Get Zoom connection status
router.get('/status', async (req: AuthRequest, res, next) => {
  try {
    const integration = await zoomService.getIntegration(req.userId!);
    if (!integration) {
      return res.json({ connected: false });
    }
    res.json({
      connected: true,
      email: integration.email,
      accountId: integration.account_id,
      createdAt: integration.created_at,
    });
  } catch (error) {
    next(error);
  }
});

// Get Zoom OAuth URL
router.get('/auth-url', (req: AuthRequest, res) => {
  const redirectUri = (req.query.redirectUri as string) || 'http://localhost:3001/dashboard/integrations';
  const url = zoomService.getAuthUrl(redirectUri);
  res.json({ url });
});

// Connect Zoom via OAuth code
router.post('/connect', async (req: AuthRequest, res, next) => {
  try {
    const { code, redirectUri } = req.body;
    if (!code) {
      throw new AppError(400, 'Authorization code is required');
    }

    const tokenData = await zoomService.exchangeCode(code, redirectUri || 'http://localhost:3001/dashboard/integrations');

    const integration = await zoomService.saveIntegration(req.userId!, {
      zoomUserId: tokenData.user_id,
      accountId: tokenData.account_id,
      email: tokenData.email,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
    });

    res.json({ success: true, email: integration.email });
  } catch (error) {
    next(error);
  }
});

// Disconnect Zoom
router.delete('/disconnect', async (req: AuthRequest, res, next) => {
  try {
    await zoomService.disconnect(req.userId!);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// List cloud recordings
router.get('/recordings', async (req: AuthRequest, res, next) => {
  try {
    const recordings = await zoomService.listRecordings(req.userId!);
    res.json(recordings);
  } catch (error) {
    next(error);
  }
});

// Import a Zoom recording into Meeti
router.post('/import', async (req: AuthRequest, res, next) => {
  try {
    const { topic, duration, downloadUrl } = req.body;
    if (!topic) {
      throw new AppError(400, 'Topic is required');
    }
    if (!downloadUrl) {
      throw new AppError(400, 'A recording download URL is required to import a Zoom recording');
    }

    // Create a new meeting in draft/processing status
    const meeting = await meetingRepo.create(req.userId!, {
      title: topic,
      meeting_type: 'business',
      status: 'processing',
      duration_seconds: (duration || 30) * 60,
    });

    // Persist the recording location so the worker can fetch and transcribe it
    await meetingRepo.createRecording(meeting.id, downloadUrl);

    // Queue for transcription & AI notes generation
    await queueMeeting(meeting.id);

    res.json({
      success: true,
      message: 'Zoom recording imported and queued for AI transcription',
      meetingId: meeting.id,
      title: meeting.title,
    });
  } catch (error) {
    next(error);
  }
});

export { router as zoomRouter };
