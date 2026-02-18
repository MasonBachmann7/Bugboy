import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from '@bugstack/error-capture-sdk';
import '@/lib/bugstack';
import { db, sendNotification } from '@/lib/db';

export const POST = withBugStack(async (request: NextRequest) => {
  const body = await request.json();
  const { userId, message, channel } = body;

  if (!userId || !message) {
    return NextResponse.json(
      { error: 'userId and message are required' },
      { status: 400 }
    );
  }

  const user = await db.users.findUnique({ where: { id: userId } });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const deliveryResult = sendNotification(user.email, message, channel || 'email');

  const log = await db.notificationLogs.create({
    data: {
      userId,
      message,
      channel: channel || 'email',
      deliveredAt: deliveryResult.delivery.timestamp,
      messageId: deliveryResult.delivery.id,
    },
  });

  return NextResponse.json({ success: true, logId: log.id });
});
