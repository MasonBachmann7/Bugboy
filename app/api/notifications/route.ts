import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from 'bugstack-sdk';
import '@/lib/bugstack';
import { db } from '@/lib/db';
import { notificationQueue } from '@/lib/queue';

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

  notificationQueue.send({ userId, message, channel });

  return NextResponse.json({ queued: true });
});
