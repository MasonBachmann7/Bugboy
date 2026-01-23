import { ErrorCaptureClient, withBugStack } from "@bugstack/error-capture-sdk";

if (!ErrorCaptureClient.isInitialized()) {
  ErrorCaptureClient.init({
    apiKey: process.env.BUGSTACK_API_KEY || "bugstack_dev_key_123",
    endpoint: process.env.ERROR_SERVICE_URL || "http://localhost:3001/api/capture",
  });
}

export { withBugStack };