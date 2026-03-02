import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from 'bugstack-sdk';
import '@/lib/bugstack';
import { db } from '@/lib/db';

export const POST = withBugStack(async (request: NextRequest) => {
  const body = await request.json();
  const { pageId } = body;

  if (!pageId) {
    return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
  }

  const existing = await db.pageViews.findUnique({
    where: { pageId },
  });

  if (existing) {
    const updated = await db.pageViews.update({
      where: { pageId },
      data: { count: existing.count + 1, lastViewedAt: new Date() },
    });
    return NextResponse.json({ views: updated.count });
  } else {
    const created = await db.pageViews.create({
      data: { pageId, count: 1, lastViewedAt: new Date() },
    });
    return NextResponse.json({ views: created.count });
  }
});
