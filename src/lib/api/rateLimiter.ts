import { getRedis } from '../redis';

/**
 * レートリミットはクライアントIPをキーに行う。
 * `getClientIP` でIPを取得できない場合は一時IDが渡され、
 * リクエストごとにIDが変わるため実質的に制限されない。
 * ログの警告を監視し環境設定を見直すこと。
 */
// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // Maximum 60 requests per minutes
const REDIS_KEY_PREFIX = 'rate_limit:';

// Fallback in-memory store when Redis is unavailable
const fallbackRateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Generate Redis key for rate limiting
 */
function getRateLimitKey(ip: string): string {
  return `${REDIS_KEY_PREFIX}${ip}`;
}

/**
 * Log audit information for monitoring
 */
function logAuditInfo(ip: string, count: number, allowed: boolean): void {
  console.log(`Rate limit audit: IP=${ip}, count=${count}, allowed=${allowed}, timestamp=${new Date().toISOString()}`);
}

/**
 * Fallback rate limiting using in-memory Map
 */
function checkRateLimitFallback(ip: string): boolean {
  const now = Date.now();
  const clientData = fallbackRateLimitMap.get(ip);

  if (!clientData || now > clientData.resetTime) {
    fallbackRateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    logAuditInfo(ip, 1, true);
    return true;
  }

  if (clientData.count < MAX_REQUESTS_PER_WINDOW) {
    clientData.count++;
    logAuditInfo(ip, clientData.count, true);
    return true;
  }

  logAuditInfo(ip, clientData.count, false);
  return false;
}

/**
 * Get rate limit info using fallback method
 */
function getRateLimitInfoFallback(ip: string): { remaining: number; resetTime: number } {
  const clientData = fallbackRateLimitMap.get(ip);
  const now = Date.now();

  if (!clientData || now > clientData.resetTime) {
    return {
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  return {
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - clientData.count),
    resetTime: clientData.resetTime,
  };
}

/**
 * Check if the client IP is within rate limits
 * @param ip - Client IP address
 * @returns true if within limits, false if rate limited
 */
export async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const redis = await getRedis();
    
    if (!redis) {
      console.warn('Redis unavailable, using fallback rate limiting');
      return checkRateLimitFallback(ip);
    }

    const key = getRateLimitKey(ip);
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    // Use Redis sorted set with sliding window
    const pipeline = redis.pipeline();

    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count current requests
    pipeline.zcard(key);

    // Add current request
    const member = `${now}-${Math.random()}`;
    pipeline.zadd(key, now, member);

    // Set expiration
    pipeline.expire(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    
    const results = await pipeline.exec();
    
    if (!results || results.length < 4) {
      console.warn('Redis pipeline failed, using fallback');
      return checkRateLimitFallback(ip);
    }

    const currentCount = (results[1][1] as number) || 0;
    const allowed = currentCount < MAX_REQUESTS_PER_WINDOW;
    
    logAuditInfo(ip, currentCount + 1, allowed);
    
    if (!allowed) {
      // Remove the request we just added since it's not allowed
      await redis.zrem(key, member);
    }
    
    return allowed;

  } catch (error) {
    console.error('Redis rate limit check failed:', error);
    console.warn('Falling back to in-memory rate limiting');
    return checkRateLimitFallback(ip);
  }
}

/**
 * Get remaining requests for a client IP
 * @param ip - Client IP address
 * @returns remaining requests and reset time
 */
export async function getRateLimitInfo(ip: string): Promise<{ remaining: number; resetTime: number }> {
  try {
    const redis = await getRedis();
    
    if (!redis) {
      return getRateLimitInfoFallback(ip);
    }

    const key = getRateLimitKey(ip);
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    // Clean old entries and count current requests
    await redis.zremrangebyscore(key, 0, windowStart);
    const currentCount = await redis.zcard(key);
    
    return {
      remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - currentCount),
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };

  } catch (error) {
    console.error('Redis rate limit info failed:', error);
    return getRateLimitInfoFallback(ip);
  }
}

/**
 * Clean up expired entries from fallback rate limit map
 * This should be called periodically to prevent memory leaks
 */
export function cleanupRateLimitMap(): void {
  const now = Date.now();
  
  for (const [ip, data] of fallbackRateLimitMap.entries()) {
    if (now > data.resetTime) {
      fallbackRateLimitMap.delete(ip);
    }
  }
}

// Export constants for testing
export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: RATE_LIMIT_WINDOW_MS,
  MAX_REQUESTS: MAX_REQUESTS_PER_WINDOW,
} as const;