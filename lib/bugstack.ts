import { BugStackClient } from "bugstack-sdk";

BugStackClient.init({
  apiKey: process.env.BUGSTACK_API_KEY!,
  projectId: "bugboy",
});
