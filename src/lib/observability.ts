/**
 * ログ・監視ユーティリティ
 * 構造化ログ出力と将来のSentry/DataDog連携準備
 */

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
 * 構造化ログイベントの出力
 */
export function logEvent(name: string, payload: LogPayload = {}): void {
  try {
    const logData = {
      name,
      timestamp: Date.now(),
      level: 'info',
      ...payload,
    };
    
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
 * エラーログの出力
 */
export function logError(error: Error | unknown, context: LogContext = {}, additionalData: Record<string, any> = {}): void {
  const errorData: Record<string, any> = {
    level: 'error' as const,
    context,
    ...additionalData,
  };

  if (error instanceof Error) {
    errorData.error_message = error.message;
    errorData.error_stack = error.stack;
    errorData.error_name = error.name;
  } else {
    errorData.error_message = String(error);
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