import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import {
  slackService,
  SlackIntegrationManager,
  SlackChannelDirectory,
  SlackMeetingNotifier,
} from '../services/slack';
import { Database, Queryable } from '@meeti/database';
import { config } from '../config';

const router = Router();
const db: Queryable = new Database(config.database);
const slack: SlackIntegrationManager & SlackChannelDirectory & SlackMeetingNotifier = slackService;

router.use(authenticate);

// Get Slack connection status
router.get('/status', async (req: AuthRequest, res, next) => {
  try {
    const integration = await slack.getIntegration(req.userId!);
    if (!integration) {
      return res.json({ connected: false });
    }
    res.json({
      connected: true,
      teamName: integration.team_name,
      teamId: integration.team_id,
      defaultChannelId: integration.default_channel_id,
      defaultChannelName: integration.default_channel_name,
      notifyOnComplete: integration.notify_on_complete,
      notifyOnActionItems: integration.notify_on_action_items,
    });
  } catch (error) {
    next(error);
  }
});

// Connect Slack (exchange code for token via Slack OAuth)
router.post('/connect', async (req: AuthRequest, res, next) => {
  try {
    const { code, redirectUri } = req.body;
    if (!code) throw new AppError(400, 'Authorization code is required');

    const slackClientId = process.env.SLACK_CLIENT_ID;
    const slackClientSecret = process.env.SLACK_CLIENT_SECRET;

    if (!slackClientId || !slackClientSecret) {
      throw new AppError(503, 'Slack integration is not configured');
    }

    const axios = require('axios');
    const tokenResponse = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        code,
        client_id: slackClientId,
        client_secret: slackClientSecret,
        redirect_uri: redirectUri,
      },
    });

    if (!tokenResponse.data.ok) {
      throw new AppError(400, `Slack OAuth error: ${tokenResponse.data.error}`);
    }

    const { access_token, team, bot_user_id, incoming_webhook } = tokenResponse.data;

    await slack.saveIntegration(req.userId!, {
      teamId: team.id,
      teamName: team.name,
      botToken: access_token,
      botUserId: bot_user_id,
      webhookUrl: incoming_webhook?.url,
      defaultChannelId: incoming_webhook?.channel_id,
      defaultChannelName: incoming_webhook?.channel,
    });

    res.json({ success: true, teamName: team.name });
  } catch (error) {
    next(error);
  }
});

// Disconnect Slack
router.delete('/disconnect', async (req: AuthRequest, res, next) => {
  try {
    await slack.disconnect(req.userId!);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// List available Slack channels
router.get('/channels', async (req: AuthRequest, res, next) => {
  try {
    const channels = await slack.listChannels(req.userId!);
    res.json(channels);
  } catch (error) {
    next(error);
  }
});

// Update notification settings
router.patch('/settings', async (req: AuthRequest, res, next) => {
  try {
    const { notifyOnComplete, notifyOnActionItems, defaultChannelId, defaultChannelName } = req.body;
    const updated = await slack.updateNotificationSettings(req.userId!, {
      notifyOnComplete,
      notifyOnActionItems,
      defaultChannelId,
      defaultChannelName,
    });
    if (!updated) throw new AppError(404, 'Slack integration not found');
    res.json({ success: true, settings: updated });
  } catch (error) {
    next(error);
  }
});

// Manually send meeting notes to Slack
router.post('/send', async (req: AuthRequest, res, next) => {
  try {
    const { meetingId, channelId } = req.body;
    if (!meetingId) throw new AppError(400, 'Meeting ID is required');

    const meeting = await db.queryOne('SELECT * FROM meetings WHERE id = $1 AND user_id = $2', [meetingId, req.userId]);
    if (!meeting) throw new AppError(404, 'Meeting not found');

    const [summary, actionItems] = await Promise.all([
      db.queryOne('SELECT * FROM meeting_summaries WHERE meeting_id = $1 ORDER BY created_at DESC LIMIT 1', [meetingId]),
      db.query('SELECT * FROM action_items WHERE meeting_id = $1 AND status != $2', [meetingId, 'cancelled']),
    ]);

    await slack.sendMeetingNotes(req.userId!, {
      meetingId,
      title: meeting.title,
      duration: meeting.duration_seconds || 0,
      summary: summary?.executive_summary || summary?.summary,
      actionItems: actionItems || [],
    }, channelId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export { router as slackRouter };
