import { BugStackClient } from "bugstack-sdk/next";

BugStackClient.init({
  apiKey: process.env.BUGSTACK_API_KEY!,
  projectId: "bugboy",
});
