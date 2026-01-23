// Error Capture SDK initialization and configuration
// This module sets up the @bugstack/error-capture-sdk for automatic error reporting to BugStack

import { ErrorCaptureClient, withBugStack } from '@bugstack/error-capture-sdk';

// Initialize the SDK if not already initialized
export function initializeErrorCapture() {
  if (!ErrorCaptureClient.isInitialized()) {
    ErrorCaptureClient.init({
      apiKey: process.env.BUGSTACK_API_KEY || 'bugstack_dev_key_123',
      endpoint: process.env.ERROR_SERVICE_URL || 'http://localhost:3001/api/capture',
    });
  }
}

// Re-export SDK functions for use throughout the app
export { ErrorCaptureClient, withBugStack };

// Helper to manually log errors (SDK captures via withBugStack wrapper)
export function captureError(error: Error, context?: Record<string, unknown>) {
  console.error('[BugStack] Error captured:', error.message, context);
  // The SDK automatically captures errors when API routes are wrapped with withBugStack
}