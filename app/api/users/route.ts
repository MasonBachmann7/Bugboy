import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from 'bugstack-sdk';
import '@/lib/bugstack';
import { db } from '@/lib/db';

export const GET = withBugStack(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  const users = await db.users.findMany(
    role ? { where: { role: role as 'admin' | 'user' | 'guest' } } : undefined
  );

  const transformedUsers = users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.profile?.avatarUrl,
    department: user.profile?.department,
    joinedAt: user.createdAt.toISOString(),
    isActive: user.lastLoginAt
      ? Date.now() - user.lastLoginAt.getTime() < 30 * 24 * 60 * 60 * 1000
      : false,
  }));

  return NextResponse.json({
    users: transformedUsers,
    total: transformedUsers.length,
  });
});