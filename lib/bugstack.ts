import { ErrorCaptureClient } from "@bugstack/error-capture-sdk";

ErrorCaptureClient.init({
  apiKey: process.env.BUGSTACK_API_KEY!,
  projectId: "bugboy",
});
