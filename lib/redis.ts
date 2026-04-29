import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;

export async function getRedis(): Promise<RedisClientType> {
  if (client && client.isOpen) {
    return client;
  }
  client = createClient({
    url: process.env.REDIS_URL ?? 'redis://redis-not-here:6379',
    socket: {
      connectTimeout: 1500,
      reconnectStrategy: false,
    },
  });
  client.on('error', () => {
    // The route propagates the original rejection; this listener keeps
    // node from logging the same error twice.
  });
  try {
    await client.connect();
  } catch {
    client = null;
    throw new Error('Failed to connect to Redis: ECONNREFUSED redis:6379');
  }
  return client;
}
