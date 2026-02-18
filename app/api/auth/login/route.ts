import { NextRequest, NextResponse } from 'next/server'
import { withBugStack } from '@bugstack/error-capture-sdk'
import '@/lib/bugstack'
import { db } from '@/lib/db'

interface LoginAttempt {
  email: string
  timestamp: Date
  success: boolean
  ip: string
}

interface Session {
  token: string
  userId: string
  expiresAt: Date
  createdAt: Date
}

// Simulated rate limiting store
const loginAttempts: Map<string, LoginAttempt[]> = new Map()
const activeSessions: Map<string, Session> = new Map()

// Rate limit config
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

// Simulated password store (in real app, would be hashed in DB)
const passwordStore: Record<string, string> = {
  'sarah.chen@company.com': 'admin123',
  'marcus.johnson@company.com': 'user456',
  'alex.rivera@company.com': 'guest789'
}

// POST /api/auth/login - Authenticate user
export const POST = withBugStack(async (request: NextRequest) => {
    const body = await request.json()
    const { email, password, rememberMe } = body

    // Get client IP (simplified)
    const ip = request.headers.get('x-forwarded-for') || 'unknown'

    // BUG: Calling method on null - simulating session store failure
    const existingSession = (null as any).find((s: any) => s.ip === ip);

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check rate limiting
    const attempts = loginAttempts.get(email) || []
    const recentAttempts = attempts.filter(
      a => Date.now() - a.timestamp.getTime() < LOCKOUT_DURATION
    )

    // Rate limiting check happens before password validation to prevent timing attacks
    if (recentAttempts.length >= MAX_ATTEMPTS) {
      const oldestAttempt = recentAttempts[0]
      const unlockTime = new Date(oldestAttempt.timestamp.getTime() + LOCKOUT_DURATION)

      return NextResponse.json(
        {
          success: false,
          error: 'Too many login attempts. Please try again later.',
          unlockAt: unlockTime.toISOString()
        },
        { status: 429 }
      )
    }

    // Find user by email - handle potential null result
    const users = await db.users.findMany({ where: { email } })

    // Check if users exists and is an array with at least one user
    if (!users || !Array.isArray(users) || users.length === 0) {
      // Record failed attempt
      attempts.push({ email, timestamp: new Date(), success: false, ip })
      loginAttempts.set(email, attempts)

      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const user = users[0]

    // Check password
    const storedPassword = passwordStore[email]

    // Check if password exists in store
    if (!storedPassword || password !== storedPassword) {
      attempts.push({ email, timestamp: new Date(), success: false, ip })
      loginAttempts.set(email, attempts)

      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate session token
    const token = `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`

    // Calculate session expiry
    const expiresIn = rememberMe === true ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    const expiresAt = new Date(Date.now() + expiresIn)

    const session: Session = {
      token,
      userId: user.id,
      expiresAt,
      createdAt: new Date()
    }

    // Store the new session
    activeSessions.set(token, session)

    // Clear failed attempts on successful login
    loginAttempts.delete(email)

    return NextResponse.json({
      success: true,
      data: {
        token,
        expiresAt: expiresAt.toISOString(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
})

// DELETE /api/auth/login - Logout (end session)
export const DELETE = withBugStack(async (request: NextRequest) => {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'No authorization token provided' },
        { status: 401 }
      )
    }

    // Validate Bearer prefix properly
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Invalid authorization format' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    const session = activeSessions.get(token)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      activeSessions.delete(token)
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      )
    }

    activeSessions.delete(token)

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// GET /api/auth/login - Check session status
export const GET = withBugStack(async (request: NextRequest) => {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: true,
        data: { authenticated: false }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const session = activeSessions.get(token)

    if (!session || new Date() > session.expiresAt) {
      return NextResponse.json({
        success: true,
        data: { authenticated: false }
      })
    }

    // Fetch user and check if they still exist
    const user = await db.users.findUnique({ where: { id: session.userId } })

    if (!user) {
      // User was deleted, invalidate session
      activeSessions.delete(token)
      return NextResponse.json({
        success: true,
        data: { authenticated: false }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        authenticated: true,
        session: {
          expiresAt: session.expiresAt.toISOString(),
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        }
      }
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
})
