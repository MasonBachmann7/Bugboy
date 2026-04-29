// Notification queue client. In production this would talk to the
// notification worker via the internal queue (NATS / SQS / etc.).
// The hosted demo does not run a worker, so the connection helper
// rejects when callers try to enqueue a job.

const QUEUE_URL = process.env.NOTIFICATION_QUEUE_URL ?? 'queue://notifications';

export interface NotificationJob {
  userId: string;
  message: string;
  channel?: string;
}

export const notificationQueue = {
  send(job: NotificationJob): Promise<{ jobId: string }> {
    return new Promise((_resolve, reject) => {
      setImmediate(() => {
        reject(new Error('Notification queue unavailable'));
      });
    });
  },

  url() {
    return QUEUE_URL;
  },
};
