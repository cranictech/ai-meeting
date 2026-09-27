import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config';
import { Database, MeetingRepository, TranscriptRepository, ActionItemRepository } from '@meeting-ai/database';
import { TranscriptionService } from '../services/transcription';
import { AnalysisService } from '../services/analysis';
import { NotificationService } from '../services/notification';

let connection: IORedis | null = null;

if (config.redis.enabled) {
  try {
    if (config.redis.url && config.redis.token) {
      connection = new IORedis(config.redis.url, {
        maxRetriesPerRequest: null,
        retryStrategy: () => null,
        lazyConnect: true,
      });
    } else {
      connection = new IORedis({
        host: config.redis.host,
        port: config.redis.port,
        maxRetriesPerRequest: null,
        retryStrategy: () => null,
        lazyConnect: true,
      });
    }
  } catch (err) {
    console.warn('Failed to initialize Redis connection, running in direct async mode:', err);
    connection = null;
  }
}

export const meetingQueue = connection ? new Queue('meeting-processing', { connection }) : null;

const db = new Database(config.database);
const meetingRepo = new MeetingRepository(db);
const transcriptRepo = new TranscriptRepository(db);
const actionItemRepo = new ActionItemRepository(db);
const transcriptionService = new TranscriptionService();
const aiService = new AnalysisService();
const notificationService = new NotificationService(db);

interface MeetingJob {
  meetingId: string;
}

export async function processMeeting(meetingId: string): Promise<void> {
  console.log(`Processing meeting ${meetingId}`);

  try {
    // 1. Get meeting
    const meeting = await meetingRepo.findById(meetingId);
    if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

    await meetingRepo.updateStatus(meetingId, 'processing');

    // 2. Locate audio file
    const recording = await meetingRepo.getRecordingByMeetingId(meetingId);
    let audioFilePath = '';

    if (recording && recording.storage_path) {
      const candidatePaths = [
        recording.storage_path,
        path.join(process.cwd(), 'uploads', recording.storage_path),
        path.join(process.cwd(), recording.storage_path),
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          audioFilePath = p;
          break;
        }
      }
    }

    // 3. Transcribe audio
    let transcript = await transcriptRepo.findByMeetingId(meetingId);
    if (!transcript) {
      transcript = await transcriptRepo.create(meetingId, config.ai.sttProvider);
    }
    await transcriptRepo.updateStatus(transcript.id, 'processing');

    const transcriptionResult = await transcriptionService.transcribe(audioFilePath, meeting.title);

    // 4. Create speakers if needed
    const existingSpeakers = await transcriptRepo.getSpeakers(meetingId);
    const speakerMap: Record<string, string> = {};

    for (const seg of transcriptionResult.segments) {
      const label = seg.speaker || 'Speaker 1';
      if (!speakerMap[label]) {
        const found = existingSpeakers.find(s => s.speaker_label === label);
        if (found) {
          speakerMap[label] = found.id;
        } else {
          const newSpeaker = await transcriptRepo.createSpeaker(meetingId, label);
          speakerMap[label] = newSpeaker.id;
        }
      }
    }

    // 5. Save segments
    // Clean old segments if re-processing
    await db.query('DELETE FROM transcript_segments WHERE transcript_id = $1', [transcript.id]);

    const detectedLanguage = transcriptionResult.language || 'en';
    const uniqueLanguages = new Set([detectedLanguage]);

    for (let i = 0; i < transcriptionResult.segments.length; i++) {
      const segment = transcriptionResult.segments[i];
      await transcriptRepo.createSegment({
        transcript_id: transcript.id,
        segment_index: i,
        start_time: segment.start,
        end_time: segment.end,
        text: segment.text,
        language: detectedLanguage,
        speaker_id: segment.speaker ? speakerMap[segment.speaker] : undefined,
        confidence: 0.95,
      });
    }

    // Update transcript language
    await db.query('UPDATE transcripts SET language = $1 WHERE id = $2', [detectedLanguage, transcript.id]);

    // Update meeting with detected languages
    await db.query('UPDATE meetings SET detected_languages = $1 WHERE id = $2', [Array.from(uniqueLanguages), meetingId]);

    await transcriptRepo.updateStatus(transcript.id, 'completed');

    // 6. AI Analysis
    const analysis = await aiService.analyzeMeeting(
      transcriptionResult.text,
      meeting.meeting_type,
      meeting.title
    );

    // 7. Save summary
    await actionItemRepo.createSummary(
      meetingId,
      analysis.summary,
      analysis.executiveSummary,
      analysis.sentiment,
      analysis.keyPoints
    );

    // 8. Save decisions
    for (const decision of analysis.decisions) {
      await actionItemRepo.createDecision(
        meetingId,
        decision.decision,
        decision.timestamp
      );
    }

    // 9. Save risks
    for (const risk of analysis.risks) {
      await db.query(
        'INSERT INTO meeting_risks (meeting_id, risk) VALUES ($1, $2)',
        [meetingId, risk]
      );
    }

    // 10. Save follow-ups
    for (const followUp of analysis.followUps) {
      await db.query(
        'INSERT INTO meeting_followups (meeting_id, follow_up) VALUES ($1, $2)',
        [meetingId, followUp]
      );
    }

    // 11. Save action items
    for (const item of analysis.actionItems) {
      await actionItemRepo.create(meetingId, {
        task: item.task,
        assignee: item.assignee,
        assignee_user_id: meeting.user_id,
        due_date: item.dueDate ? new Date(item.dueDate) : undefined,
        priority: item.priority,
      });
    }

    // 12. Update Search Index
    try {
      const combinedSearchText = [
        meeting.title,
        meeting.meeting_type,
        analysis.summary,
        analysis.executiveSummary,
        analysis.decisions.map(d => d.decision).join(' '),
        analysis.actionItems.map(a => a.task).join(' '),
        analysis.risks.join(' '),
        analysis.followUps.join(' '),
        transcriptionResult.text,
      ].filter(Boolean).join(' ');

      await db.query('DELETE FROM search_index WHERE meeting_id = $1', [meetingId]);
      await db.query(
        `INSERT INTO search_index (meeting_id, user_id, document)
         VALUES ($1, $2, to_tsvector('english', $3))`,
        [meetingId, meeting.user_id, combinedSearchText]
      );
    } catch (searchErr) {
      console.warn('Failed to update search index:', searchErr);
    }

    // 13. Update meeting status
    await meetingRepo.updateStatus(meetingId, 'completed');

    // 14. Notify user
    try {
      await notificationService.notifyMeetingComplete(
        meeting.user_id,
        meetingId,
        meeting.title
      );
    } catch (notifErr) {
      // Ignore notification failure in development
    }

    console.log(`Meeting ${meetingId} processed successfully`);
  } catch (error) {
    console.error(`Failed to process meeting ${meetingId}:`, error);
    await meetingRepo.updateStatus(meetingId, 'failed');

    const meeting = await meetingRepo.findById(meetingId);
    if (meeting) {
      try {
        await notificationService.notifyMeetingFailed(
          meeting.user_id,
          meetingId,
          meeting.title
        );
      } catch (e) {
        // ignore notification error
      }
    }

    throw error;
  }
}

export async function queueMeeting(meetingId: string): Promise<void> {
  if (meetingQueue) {
    try {
      await meetingQueue.add('process-meeting', { meetingId });
      return;
    } catch (err) {
      console.warn('Failed to add job to queue, running directly:', err);
    }
  }

  // Fallback to async direct execution
  setImmediate(async () => {
    try {
      await processMeeting(meetingId);
    } catch (err) {
      console.error(`Background processing failed for meeting ${meetingId}:`, err);
    }
  });
}

let meetingWorker: Worker<MeetingJob> | null = null;

if (config.redis.enabled && connection) {
  try {
    meetingWorker = new Worker<MeetingJob>(
      'meeting-processing',
      async (job) => {
        await processMeeting(job.data.meetingId);
      },
      {
        connection,
        concurrency: 3,
      }
    );

    meetingWorker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    meetingWorker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });
  } catch (err) {
    console.warn('Worker initialization skipped:', err);
  }
}
