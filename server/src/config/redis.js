import Redis from 'ioredis';
import { env, redactUrl } from './env.js';

let redisClient = null;
let isRedisAvailable = false;

export const initRedis = () => {
  if (redisClient) return redisClient;

  // No URL (only possible in production when REDIS_URL is unset): run on the
  // in-memory fallbacks instead of silently connecting to localhost.
  if (!env.redisUrl) {
    console.warn('Redis disabled (REDIS_URL not set). In-memory fallbacks will be active.');
    return null;
  }

  try {
    redisClient = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 1000, 5000);
        return delay;
      },
      enableOfflineQueue: true,
      lazyConnect: true
    });

    redisClient.connect().then(() => {
      isRedisAvailable = true;
      // Never log the full URL - it contains the password.
      console.log('Redis connected successfully at:', redactUrl(env.redisUrl));
    }).catch((err) => {
      isRedisAvailable = false;
      console.warn(`Redis connection warning (${err.message}). In-memory fallbacks will be active.`);
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
    });

    redisClient.on('ready', () => {
      isRedisAvailable = true;
    });

    redisClient.on('end', () => {
      isRedisAvailable = false;
    });
  } catch (err) {
    isRedisAvailable = false;
    console.warn('Redis initialization skipped:', err.message);
  }

  return redisClient;
};

export const getRedisClient = () => redisClient;
export const checkRedisAvailable = () => isRedisAvailable;

export const closeRedis = async () => {
  if (!redisClient) return;
  const client = redisClient;
  redisClient = null;
  isRedisAvailable = false;
  try {
    await client.quit();
  } catch {
    client.disconnect();
  }
};

// Key prefixes
export const REDIS_KEYS = {
  OFFICER_LOC: (officerId) => `officer:loc:${officerId}`,
  OFFICER_GEO: 'officers:geo',
  ACTIVE_SOS: (sosId) => `sos:active:${sosId}`,
  ACTIVE_PATROL: (patrolId) => `patrol:active:${patrolId}`
};
