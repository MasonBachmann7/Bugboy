import { withErrorCapture } from '@bugstack/error-capture-sdk';
import '@/lib/bugstack';
import { NextResponse } from 'next/server';

// GET /api/example - example endpoint with proper error handling
export const GET = withErrorCapture(async () => {
  try {
    // Example successful response
    const data = {
      message: 'Hello from BugStack example API!',
      timestamp: new Date().toISOString(),
      status: 'success'
    };
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error in /api/example:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
});