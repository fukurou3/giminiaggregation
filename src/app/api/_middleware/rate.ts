/**
 * レート制限ミドルウェア
 * DoS攻撃防止とAPI濫用防止のための簡易レート制限
 */

import { CONFIG } from '@/lib/config';
import { logRateLimit } from '@/lib/observability';

interface RateLimitBucket {
  count: number;
  resetTime: number;
}

// メモリベースのレート制限バケット
const buckets = new Map<string, RateLimitBucket>();

/**
 * レート制限チェック
 * @param key 識別キー（通常はIP address）
 * @param limit 制限回数（デフォルト：設定値）
 * @param windowMs 制限時間窓（デフォルト：設定値）
 * @returns true: 許可, false: 制限
 */
export function allow(
  key: string, 
  limit: number = CONFIG.RATE_LIMIT_MAX, 
  windowMs: number = CONFIG.RATE_LIMIT_WINDOW_MS
): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);

  // バケットが存在しないか、時間窓がリセットされた場合
  if (!bucket || now >= bucket.resetTime) {
    bucket = {
      count: 0,
      resetTime: now + windowMs
    };
  }

  bucket.count++;
  buckets.set(key, bucket);

  const allowed = bucket.count <= limit;

  if (!allowed) {
    logRateLimit(key, limit, windowMs);
  }

  // 定期的にバケットをクリーンアップ（メモリリーク防止）
  if (Math.random() < 0.01) { // 1%の確率で実行
    cleanupBuckets(now);
  }

  return allowed;
}

/**
 * 期限切れのバケットを削除
 */
function cleanupBuckets(now: number): void {
  for (const [key, bucket] of buckets.entries()) {
    if (now >= bucket.resetTime) {
      buckets.delete(key);
    }
  }
}

/**
 * 残り制限回数を取得
 */
export function getRemainingRequests(
  key: string, 
  limit: number = CONFIG.RATE_LIMIT_MAX
): number {
  const bucket = buckets.get(key);
  if (!bucket || Date.now() >= bucket.resetTime) {
    return limit;
  }
  return Math.max(0, limit - bucket.count);
}

/**
 * リセット時刻を取得
 */
export function getResetTime(key: string): number | null {
  const bucket = buckets.get(key);
  if (!bucket || Date.now() >= bucket.resetTime) {
    return null;
  }
  return bucket.resetTime;
}

/**
 * NextJS Request からクライアントIPを取得
 */
export function getClientIP(request: Request): string {
  // Vercel や他のプラットフォームでの IP 取得
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }
  
  // ローカル開発環境用
  return 'localhost';
}

/**
 * レート制限情報をヘッダーに設定するためのヘルパー
 */
export function createRateLimitHeaders(
  key: string, 
  limit: number = CONFIG.RATE_LIMIT_MAX
): Record<string, string> {
  const remaining = getRemainingRequests(key, limit);
  const resetTime = getResetTime(key);
  
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
  };
  
  if (resetTime) {
    headers['X-RateLimit-Reset'] = Math.ceil(resetTime / 1000).toString(); // Unix timestamp
  }
  
  return headers;
}