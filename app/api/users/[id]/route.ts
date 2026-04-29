import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from 'bugstack-sdk';
import '@/lib/bugstack';
import { db } from '@/lib/db';

export const GET = withBugStack(
  async (_request: NextRequest, context: { params: { id: string } }) => {
    const user = await db.users.findUnique({ where: { id: context.params.id } });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.profile.avatarUrl,
      department: user.profile.department,
      joinedAt: user.createdAt.toISOString(),
    });
  }
);
