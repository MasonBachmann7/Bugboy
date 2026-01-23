import { NextResponse } from 'next/server';
import { withBugStack } from '@/lib/bugstack';
import { db, User } from '@/lib/db';

// GET /api/users - Fetch all users with optional role filter
export const GET = withBugStack(async (request) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role') as User['role'] | null;

    // Build query options
    const queryOptions = role ? { where: { role } } : undefined;

    // Fetch users from database
    const users = await db.users.findMany(queryOptions);

    // Validate that users is an array before calling map
    if (!users || !Array.isArray(users)) {
      console.error('Database query returned invalid data:', users);
      return NextResponse.json(
        {
          success: false,
          error: 'Database query failed to return valid user data',
          message: 'Unable to retrieve users at this time'
        },
        { status: 500 }
      );
    }

    // Transform user data for API response
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
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve users'
      },
      { status: 500 }
    );
  }
});