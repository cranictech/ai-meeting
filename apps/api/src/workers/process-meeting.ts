import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import { Database, MeetingRepository, TranscriptRepository, ActionItemRepository } from '@meeting-ai/database';
import { TranscriptionService } from '../services/transcription';
import { AIAnalysisService } from '../services/ai-analysis';
import { NotificationService } from '../services/notification';

let connection: IORedis | null = null;

if (config.redis.enabled) {
  if (config.redis.url && config.redis.token) {
    // For Upstash Redis, we need to use the REST URL format
    connection = new IORedis(config.redis.url, {
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
      lazyConnect: true,
    });
  } else {
    // Standard Redis connection
    connection = new IORedis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
      lazyConnect: true,
    });
  }
}

export const meetingQueue = new Queue('meeting-processing', { 
  connection: connection as any || undefined 
});

const db = new Database(config.database);
const meetingRepo = new MeetingRepository(db);
const transcriptRepo = new TranscriptRepository(db);
const actionItemRepo = new ActionItemRepository(db);
const transcriptionService = new TranscriptionService();
const aiService = new AIAnalysisService();
const notificationService = new NotificationService(db);

interface MeetingJob {
  meetingId: string;
}

let meetingWorker: Worker<MeetingJob> | null = null;

if (config.redis.enabled && connection) {
  meetingWorker = new Worker<MeetingJob>(
  'meeting-processing',
  async (job) => {
    const { meetingId } = job.data;

    console.log(`Processing meeting ${meetingId}`);

    try {
      // 1. Get meeting and audio chunks
      const meeting = await meetingRepo.findById(meetingId);
      if (!meeting) throw new Error('Meeting not found');

      // 2. Transcribe audio
      const transcript = await transcriptRepo.create(meetingId, config.ai.sttProvider);
      await transcriptRepo.updateStatus(transcript.id, 'processing');

      // In production: download and merge chunks, then transcribe
      const transcriptionResult = await transcriptionService.transcribe('path-to-merged-audio');

      // 3. Save segments
      for (let i = 0; i < transcriptionResult.segments.length; i++) {
        const segment = transcriptionResult.segments[i];
        await transcriptRepo.createSegment({
          transcript_id: transcript.id,
          segment_index: i,
          start_time: segment.start,
          end_time: segment.end,
          text: segment.text,
          language: transcriptionResult.language,
          speaker_id: undefined,
          confidence: undefined,
        });
      }

      await transcriptRepo.updateStatus(transcript.id, 'completed');

      // 4. AI Analysis
      const analysis = await aiService.analyzeMeeting(transcriptionResult.text);

      // 5. Save summary
      await actionItemRepo.createSummary(
        meetingId,
        analysis.summary,
        analysis.executiveSummary
      );

      // 6. Save decisions
      for (const decision of analysis.decisions) {
        await actionItemRepo.createDecision(
          meetingId,
          decision.decision,
          decision.timestamp
        );
      }

      // 7. Save action items
      for (const item of analysis.actionItems) {
        await actionItemRepo.create(meetingId, {
          task: item.task,
          assignee: item.assignee,
          due_date: item.dueDate ? new Date(item.dueDate) : undefined,
          priority: item.priority,
        });
      }

      // 8. Update meeting status
      await meetingRepo.updateStatus(meetingId, 'completed');

      // 9. Notify user
      await notificationService.notifyMeetingComplete(
        meeting.user_id,
        meetingId,
        meeting.title
      );

      console.log(`Meeting ${meetingId} processed successfully`);
    } catch (error) {
      console.error(`Failed to process meeting ${meetingId}:`, error);
      await meetingRepo.updateStatus(meetingId, 'failed');
      
      // Notify user of failure
      const meeting = await meetingRepo.findById(meetingId);
      if (meeting) {
        await notificationService.notifyMeetingFailed(
          meeting.user_id,
          meetingId,
          meeting.title
        );
      }
      
      throw error;
    }
  },
  {
    connection: connection as any || undefined,
    concurrency: 3,
  }
  );

  meetingWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  meetingWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });
}
