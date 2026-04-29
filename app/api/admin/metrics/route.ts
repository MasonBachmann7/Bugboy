import { NextResponse } from 'next/server';
import { withBugStack } from 'bugstack-sdk';
import '@/lib/bugstack';
import { getRedis } from '@/lib/redis';

export const GET = withBugStack(async () => {
  const redis = await getRedis();

  const [errors, fixes, users] = await Promise.all([
    redis.get('metrics:errors:24h'),
    redis.get('metrics:fixes:24h'),
    redis.get('metrics:active_users'),
  ]);

  return NextResponse.json({
    errors: Number(errors ?? 0),
    fixes: Number(fixes ?? 0),
    users: Number(users ?? 0),
  });
});
