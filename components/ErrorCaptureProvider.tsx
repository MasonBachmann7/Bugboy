'use client';

import { useEffect } from 'react';
import { ErrorCaptureClient } from '@bugstack/error-capture-sdk';

interface ErrorCaptureProviderProps {
  children: React.ReactNode;
}

export function ErrorCaptureProvider({ children }: ErrorCaptureProviderProps) {
  useEffect(() => {
    // Initialize the error-capture-sdk on the client side
    // The SDK is primarily for server-side API route wrapping,
    // but we initialize here for consistency
    if (!ErrorCaptureClient.isInitialized()) {
      ErrorCaptureClient.init({
        apiKey: process.env.NEXT_PUBLIC_BUGSTACK_API_KEY || 'bugstack_dev_key_123',
        endpoint: process.env.NEXT_PUBLIC_ERROR_SERVICE_URL || 'http://localhost:3001/api/capture',
      });
    }
  }, []);

  return <>{children}</>;
}