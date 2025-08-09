/**
 * システム設定の環境変数集約
 * 本番運用時の調整が容易になるよう設定を一元管理
 */

export const CONFIG = {
  // AI Model Settings
  MODEL_ID: process.env.MODEL_ID ?? "gemma-3n-e4b-it",
  MAX_TAGS: Number(process.env.MAX_TAGS ?? 5),
  
  // Existing Tags Fetch Settings
  EXISTING_TOP: Number(process.env.EXISTING_TOP ?? 200),     // 人気タグ取得数
  EXISTING_RECENT: Number(process.env.EXISTING_RECENT ?? 200), // 最近使用タグ取得数
  
  // Rate Limiting Settings  
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX ?? 10),     // 制限回数
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000), // 時間窓（ms）
  
  // Cache Settings
  CACHE_TTL_MS: Number(process.env.CACHE_TTL_MS ?? 60_000),     // キャッシュ有効期間（ms）
  CACHE_MAX_SIZE: Number(process.env.CACHE_MAX_SIZE ?? 1000),   // キャッシュ最大サイズ
  
  // Retry Settings
  MAX_RETRY_ATTEMPTS: Number(process.env.MAX_RETRY_ATTEMPTS ?? 3),
  RETRY_BASE_DELAY_MS: Number(process.env.RETRY_BASE_DELAY_MS ?? 1000),
  
  // Batch Processing Settings
  FIRESTORE_BATCH_SIZE: Number(process.env.FIRESTORE_BATCH_SIZE ?? 10), // Firestore IN句制限対応
  
  // AI Timeout Settings
  AI_TIMEOUT_MS: Number(process.env.AI_TIMEOUT_MS ?? 12000), // AI呼び出しタイムアウト（ms）
} as const;

/**
 * 設定値の妥当性チェック
 */
export function validateConfig(): void {
  const errors: string[] = [];
  
  if (CONFIG.MAX_TAGS < 1 || CONFIG.MAX_TAGS > 20) {
    errors.push("MAX_TAGS must be between 1 and 20");
  }
  
  if (CONFIG.EXISTING_TOP < 1 || CONFIG.EXISTING_TOP > 1000) {
    errors.push("EXISTING_TOP must be between 1 and 1000");
  }
  
  if (CONFIG.EXISTING_RECENT < 1 || CONFIG.EXISTING_RECENT > 1000) {
    errors.push("EXISTING_RECENT must be between 1 and 1000");
  }
  
  if (CONFIG.RATE_LIMIT_MAX < 1 || CONFIG.RATE_LIMIT_MAX > 1000) {
    errors.push("RATE_LIMIT_MAX must be between 1 and 1000");
  }
  
  if (CONFIG.CACHE_TTL_MS < 1000 || CONFIG.CACHE_TTL_MS > 3600000) {
    errors.push("CACHE_TTL_MS must be between 1000 and 3600000");
  }
  
  if (CONFIG.AI_TIMEOUT_MS < 5000 || CONFIG.AI_TIMEOUT_MS > 30000) {
    errors.push("AI_TIMEOUT_MS must be between 5000 and 30000");
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
}