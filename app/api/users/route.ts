import { NextResponse } from 'next/server';
import { withErrorCapture } from '@bugstack/error-capture-sdk';
import '@/lib/bugstack'; // ensures client is initialized
import { db, User } from '@/lib/db';

// GET /api/users - Fetch all users with optional role filter
export const GET = withErrorCapture(async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const role = searchParams.get('role') as User['role'] | null;

  // Build query options
  const queryOptions = role ? { where: { role } } : undefined;

  // Fetch users from database
  const users = await db.users.findMany(queryOptions);

  // Transform user data for API response
  // BUG: users can be undefined if database connection fails
  // This will throw: "Cannot read properties of undefined (reading 'map')"
  const transformedUsers = users.map(user => ({
    id: user.id,
    email: user.email,
    displayName: user.name,
    role: user.role,
    memberSince: user.createdAt.toISOString(),
    isActive: user.lastLoginAt
      ? Date.now() - user.lastLoginAt.getTime() < 30 * 24 * 60 * 60 * 1000
      : false,
  }));

  return NextResponse.json({
    success: true,
    data: transformedUsers,
    meta: {
      total: transformedUsers.length,
      timestamp: new Date().toISOString(),
    },
  });
});