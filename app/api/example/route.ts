import { withErrorCapture } from '@bugstack/error-capture-sdk';
import '@/lib/bugstack';

// GET /api/example - temporary error to verify BugStack capture
export const GET = withErrorCapture(async () => {
  throw new Error('Test bug for BugStack!');
});
