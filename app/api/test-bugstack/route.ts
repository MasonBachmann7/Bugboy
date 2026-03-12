import { NextResponse } from 'next/server'
import { withErrorCapture } from 'bugstack-sdk/next'
import '@/lib/bugstack'

export const GET = withErrorCapture(
  async (request) => {
    // This will trigger BugStack!
    throw new Error('Test error from BugBoy - BugStack should capture this!')

    // This line won't be reached
    return NextResponse.json({ success: true })
  },
  {
    apiKey: process.env.BUGSTACK_API_KEY!,
    endpoint: process.env.BUGSTACK_ENDPOINT,
    environment: process.env.NODE_ENV || 'development',
    autoFix: true,
  }
)
