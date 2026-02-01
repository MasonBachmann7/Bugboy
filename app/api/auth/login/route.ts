import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from '@bugstack/error-capture-sdk';
import '@/lib/bugstack';
import { db } from '@/lib/db';

interface LoginAttempt {
  email: string;
  timestamp: Date;
  success: boolean;
  ip: string;
}

interface Session {
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

// Simulated rate limiting store
const loginAttempts: Map<string, LoginAttempt[]> = new Map();
const activeSessions: Map<string, Session> = new Map();

// Rate limit config
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Simulated password store (in real app, would be hashed in DB)
const passwordStore: Record<string, string> = {
  'sarah.chen@company.com': 'admin123',
  'marcus.johnson@company.com': 'user456',
  'alex.rivera@company.com': 'guest789',
};

// POST /api/auth/login - Authenticate user
export const POST = withBugStack(async (request: NextRequest) => {
  const body = await request.json();
  const { email, password, rememberMe } = body;

  // Get client IP (simplified)
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  // BUG: Calling method on null - simulating session store failure
  const existingSession = (null as any).find((s: any) => s.ip === ip);

  // Validate required fields
  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: 'Email and password are required' },
      { status: 400 }
    );
  }

  // Check rate limiting
  const attempts = loginAttempts.get(email) || [];
  const recentAttempts = attempts.filter(
    a => Date.now() - a.timestamp.getTime() < LOCKOUT_DURATION
  );

  // BUG: Rate limiting check happens after password validation in some paths
  // This is a timing attack vulnerability
  if (recentAttempts.length >= MAX_ATTEMPTS) {
    const oldestAttempt = recentAttempts[0];
    const unlockTime = new Date(oldestAttempt.timestamp.getTime() + LOCKOUT_DURATION);

    return NextResponse.json(
      {
        success: false,
        error: 'Too many login attempts. Please try again later.',
        unlockAt: unlockTime.toISOString(),
      },
      { status: 429 }
    );
  }

  // Find user by email
  const users = await db.users.findMany({ where: { email } });

  // BUG: users could be undefined, causing crash on [0] access
  const user = users[0];

  // BUG: Timing attack - different response times for valid vs invalid emails
  if (!user) {
    // Record failed attempt
    attempts.push({ email, timestamp: new Date(), success: false, ip });
    loginAttempts.set(email, attempts);

    return NextResponse.json(
      { success: false, error: 'Invalid email or password' },
      { status: 401 }
    );
  }

  // Check password
  const storedPassword = passwordStore[email];

  // BUG: Plain text password comparison - should use bcrypt or similar
  // BUG: storedPassword could be undefined if email not in store
  if (password !== storedPassword) {
    attempts.push({ email, timestamp: new Date(), success: false, ip });
    loginAttempts.set(email, attempts);

    return NextResponse.json(
      { success: false, error: 'Invalid email or password' },
      { status: 401 }
    );
  }

  // Generate session token
  // BUG: Weak token generation - using timestamp is predictable
  const token = `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  // Calculate session expiry
  // BUG: rememberMe not properly validated - truthy check passes for any value
  const expiresIn = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + expiresIn);

  const session: Session = {
    token,
    userId: user.id,
    expiresAt,
    createdAt: new Date(),
  };

  // BUG: Not invalidating existing sessions for the user
  // Could lead to session accumulation
  activeSessions.set(token, session);

  // Clear failed attempts on successful login
  loginAttempts.delete(email);

  // BUG: Returning sensitive data in response
  return NextResponse.json({
    success: true,
    data: {
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    },
  });
});

// DELETE /api/auth/login - Logout (end session)
export const DELETE = withBugStack(async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json(
      { success: false, error: 'No authorization token provided' },
      { status: 401 }
    );
  }

  // BUG: Not validating Bearer prefix properly
  const token = authHeader.replace('Bearer ', '');

  const session = activeSessions.get(token);

  if (!session) {
    // BUG: Returning different error for invalid vs expired token
    // reveals information about token validity
    return NextResponse.json(
      { success: false, error: 'Invalid or expired session' },
      { status: 401 }
    );
  }

  // Check if session is expired
  // BUG: session.expiresAt might be compared incorrectly if it's a string
  if (new Date() > session.expiresAt) {
    activeSessions.delete(token);
    return NextResponse.json(
      { success: false, error: 'Session already expired' },
      { status: 401 }
    );
  }

  activeSessions.delete(token);

  return NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// GET /api/auth/login - Check session status
export const GET = withBugStack(async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json({
      success: true,
      data: { authenticated: false },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const session = activeSessions.get(token);

  if (!session || new Date() > session.expiresAt) {
    return NextResponse.json({
      success: true,
      data: { authenticated: false },
    });
  }

  // BUG: Fetching user without checking if they still exist
  const user = await db.users.findUnique({ where: { id: session.userId } });

  return NextResponse.json({
    success: true,
    data: {
      authenticated: true,
      session: {
        expiresAt: session.expiresAt.toISOString(),
        // BUG: user could be null if deleted after session created
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    },
  });
});
