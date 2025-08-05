import Redis from 'ioredis';

// Redis connection instance
let redis: Redis | null = null;

/**
 * Redis connection configuration
 */
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  connectTimeout: 2000,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryDelayOnFailover: 100,
  // Disable Redis in development if not explicitly enabled
  enableOfflineQueue: false,
} as const;

/**
 * Initialize Redis connection
 */
export async function initRedis(): Promise<Redis | null> {
  // Skip Redis in development if not explicitly enabled
  if (process.env.NODE_ENV === 'development' && !process.env.REDIS_ENABLED) {
    console.log('Redis disabled in development environment');
    return null;
  }

  if (redis) {
    return redis;
  }

  try {
    redis = new Redis(REDIS_CONFIG);
    
    // Set up error handler to prevent unhandled errors
    redis.on('error', (error) => {
      console.warn('Redis connection error:', error.message);
      redis = null;
    });
    
    // Test connection with timeout
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 3000)
      )
    ]);
    
    console.log('Redis connection established successfully');
    return redis;
  } catch (error) {
    console.warn('Redis unavailable, using fallback storage:', error instanceof Error ? error.message : String(error));
    if (redis) {
      redis.disconnect();
      redis = null;
    }
    return null;
  }
}

/**
 * Get Redis instance (initialize if needed)
 */
export async function getRedis(): Promise<Redis | null> {
  if (!redis) {
    return await initRedis();
  }
  
  try {
    // Test if connection is still alive
    await redis.ping();
    return redis;
  } catch (error) {
    console.warn('Redis connection lost, attempting to reconnect:', error);
    redis = null;
    return await initRedis();
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('Redis connection closed');
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = await getRedis();
    return client !== null;
  } catch {
    return false;
  }
}