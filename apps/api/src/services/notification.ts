import { Database } from '@meeting-ai/database';

interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  constructor(private db: Database) {}

  async create(notification: NotificationData): Promise<void> {
    await this.db.query(
      `INSERT INTO notifications (user_id, type, title, message, data) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        notification.userId,
        notification.type,
        notification.title,
        notification.message,
        JSON.stringify(notification.data || {}),
      ]
    );

    // In production: send push notification via FCM/APNs
    console.log('Notification created:', notification.title);
  }

  async notifyMeetingComplete(userId: string, meetingId: string, meetingTitle: string): Promise<void> {
    await this.create({
      userId,
      type: 'meeting_completed',
      title: 'Meeting Notes Ready',
      message: `Your notes for "${meetingTitle}" are ready to review`,
      data: { meetingId },
    });
  }

  async notifyMeetingFailed(userId: string, meetingId: string, meetingTitle: string): Promise<void> {
    await this.create({
      userId,
      type: 'meeting_failed',
      title: 'Processing Failed',
      message: `We couldn't process "${meetingTitle}". Your recording is safe. Please retry.`,
      data: { meetingId },
    });
  }

  async notifyTaskDue(userId: string, taskId: string, task: string, dueDate: Date): Promise<void> {
    await this.create({
      userId,
      type: 'task_due',
      title: 'Task Due Soon',
      message: `"${task}" is due ${dueDate.toLocaleDateString()}`,
      data: { taskId },
    });
  }
}
