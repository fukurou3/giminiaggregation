/**
 * ログ・監視ユーティリティ
 * 構造化ログ出力と将来のSentry/DataDog連携準備
 * プライバシー配慮済み（個人情報のハッシュ化・除外）
 */

import { createHash } from 'crypto';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
}

export interface LogPayload extends Record<string, any> {
  timestamp?: number;
  level?: 'info' | 'warn' | 'error' | 'debug';
  context?: LogContext;
}

/**
 * プライバシー配慮のためのハッシュ化
 */
function hashSensitiveData(data: string): string {
  return createHash('sha256').update(data).digest('hex').substring(0, 12);
}

/**
 * 個人情報を含む可能性のあるデータをサニタイズ
 */
function sanitizeLogData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = { ...data };
  
  // タイトルや説明文は記録しない（プライバシー保護）
  if ('title' in sanitized) {
    delete sanitized.title;
  }
  if ('description' in sanitized) {
    delete sanitized.description;
  }
  
  // IPアドレスはハッシュ化
  if ('client_ip' in sanitized && typeof sanitized.client_ip === 'string') {
    sanitized.client_ip_hash = hashSensitiveData(sanitized.client_ip);
    delete sanitized.client_ip;
  }
  if ('ip' in sanitized && typeof sanitized.ip === 'string') {
    sanitized.ip_hash = hashSensitiveData(sanitized.ip);
    delete sanitized.ip;
  }
  
  // ユーザーエージェントは部分的に記録
  if ('user_agent' in sanitized && typeof sanitized.user_agent === 'string') {
    sanitized.user_agent_family = sanitized.user_agent.split(' ')[0] || 'unknown';
    delete sanitized.user_agent;
  }
  if ('userAgent' in sanitized && typeof sanitized.userAgent === 'string') {
    sanitized.user_agent_family = sanitized.userAgent.split(' ')[0] || 'unknown';
    delete sanitized.userAgent;
  }
  
  return sanitized;
}

/**
 * 構造化ログイベントの出力（プライバシー配慮済み）
 */
export function logEvent(name: string, payload: LogPayload = {}): void {
  try {
    const rawLogData = {
      name,
      timestamp: Date.now(),
      level: 'info',
      ...payload,
    };
    
    // プライバシー配慮のためのデータサニタイズ
    const logData = sanitizeLogData(rawLogData);
    
    // 本番環境では外部ログサービスに送信
    if (process.env.NODE_ENV === 'production') {
      // TODO: Sentry/DataDog/CloudWatch等への送信
      console.log(JSON.stringify(logData));
    } else {
      // 開発環境では読みやすい形式で出力
      console.log(`[${logData.level?.toUpperCase()}] ${name}:`, logData);
    }
  } catch (error) {
    // ログ出力自体のエラーはサイレントに処理
    console.error('Failed to log event:', error);
  }
}

/**
 * パフォーマンス計測用タイマー
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;
  private context: LogContext;

  constructor(name: string, context: LogContext = {}) {
    this.name = name;
    this.context = context;
    this.startTime = Date.now();
  }

  /**
   * 計測終了とログ出力
   */
  end(additionalData: Record<string, any> = {}): number {
    const duration = Date.now() - this.startTime;
    
    logEvent(`${this.name}_performance`, {
      level: 'info',
      duration_ms: duration,
      context: this.context,
      ...additionalData,
    });
    
    return duration;
  }
}

/**
 * エラーログの出力（プライバシー配慮済み）
 */
export function logError(error: Error | unknown, context: LogContext = {}, additionalData: Record<string, any> = {}): void {
  const errorData: Record<string, any> = {
    level: 'error' as const,
    context,
    ...additionalData,
  };

  if (error instanceof Error) {
    // エラーメッセージから個人情報を除外
    const sanitizedMessage = error.message
      .replace(/title:\s*[^,\n]+/gi, 'title: [REDACTED]')
      .replace(/description:\s*[^,\n]+/gi, 'description: [REDACTED]')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_REDACTED]');
    
    errorData.error_message = sanitizedMessage;
    errorData.error_name = error.name;
    
    // スタックトレースは本番環境では記録しない（内部実装の漏洩防止）
    if (process.env.NODE_ENV !== 'production') {
      errorData.error_stack = error.stack;
    }
  } else {
    errorData.error_message = '[NON_ERROR_OBJECT]';
  }

  logEvent('error_occurred', errorData);
}

/**
 * レート制限イベントのログ
 */
export function logRateLimit(key: string, limit: number, windowMs: number, context: LogContext = {}): void {
  logEvent('rate_limit_exceeded', {
    level: 'warn',
    rate_limit_key: key,
    rate_limit: limit,
    window_ms: windowMs,
    context,
  });
}

/**
 * AI API呼び出しのログ
 */
export function logAIRequest(
  model: string, 
  inputTokens: number, 
  outputTokens: number, 
  duration: number, 
  success: boolean,
  context: LogContext = {}
): void {
  logEvent('ai_api_request', {
    level: success ? 'info' : 'error',
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    duration_ms: duration,
    success,
    context,
  });
}

/**
 * タグ生成成功のログ
 */
export function logTagGeneration(
  resultCount: number, 
  pickedCount: number, 
  freshCount: number, 
  duration: number,
  context: LogContext = {}
): void {
  logEvent('tag_generation_success', {
    level: 'info',
    result_count: resultCount,
    picked_count: pickedCount,
    fresh_count: freshCount,
    duration_ms: duration,
    context,
  });
}