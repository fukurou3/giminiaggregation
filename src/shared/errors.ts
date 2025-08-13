import { NextResponse } from 'next/server';
import { logError, logEvent } from '@/lib/observability';

/**
 * API エラー型定義（既存との互換性維持）
 */
export type ApiErrorType = 
  | 'rate_limited' 
  | 'invalid_request' 
  | 'validation_failed'
  | 'unauthorized' 
  | 'invalid_url'
  | 'server_error'
  | 'permission_denied'
  | 'network_error'
  | 'not_implemented'
  | 'not_found'
  | 'forbidden'
  | 'profile_incomplete'
  | 'invalid_category'
  | 'invalid_reason'
  | 'tag_flagged'
  | 'invalid_query';

/**
 * API エラーレスポンス型定義（既存との互換性維持）
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiErrorType;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

/**
 * 統一エラー情報
 */
export interface AppError {
  code: ApiErrorType;
  message: string;
  statusCode: number;
  details?: Array<{ field: string; message: string }>;
  timestamp: string;
  hint?: string;
}

/**
 * CORS ヘッダー定義
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * エラーコードのデフォルトステータスコードマッピング
 */
const ERROR_STATUS_MAP: Record<ApiErrorType, number> = {
  rate_limited: 429,
  invalid_request: 400,
  validation_failed: 400,
  unauthorized: 401,
  invalid_url: 400,
  server_error: 500,
  permission_denied: 403,
  network_error: 503,
  not_implemented: 501,
  not_found: 404,
  forbidden: 403,
  profile_incomplete: 400,
  invalid_category: 400,
  invalid_reason: 400,
  tag_flagged: 400,
  invalid_query: 400,
};

/**
 * エラー情報を構造化して作成
 */
function createAppError(
  error: ApiErrorType,
  message: string,
  status?: number,
  details?: Array<{ field: string; message: string }>,
  hint?: string
): AppError {
  return {
    code: error,
    message,
    statusCode: status ?? ERROR_STATUS_MAP[error] ?? 400,
    details,
    timestamp: new Date().toISOString(),
    hint,
  };
}

/**
 * 統一ログ出力
 */
function logApiError(
  appError: AppError, 
  context: Record<string, unknown> = {}
): void {
  // エラーレベルに応じて適切なログ出力
  if (appError.statusCode >= 500) {
    logError(new Error(appError.message), context, {
      error_code: appError.code,
      status_code: appError.statusCode,
      timestamp: appError.timestamp,
    });
  } else {
    // 4xx エラーは通常の運用ログ
    logEvent('api_client_error', {
      error_code: appError.code,
      message: appError.message,
      status_code: appError.statusCode,
      details_count: appError.details?.length ?? 0,
      ...context,
    });
  }
}

/**
 * 既存 createErrorResponse 関数（100%互換性維持）
 * 
 * @param error エラーコード
 * @param message エラーメッセージ
 * @param status HTTPステータスコード（省略時はエラーコードに基づく推定値）
 * @param details 詳細エラー情報（バリデーションエラー等）
 * @returns NextResponse<ApiErrorResponse>
 */
export function createErrorResponse(
  error: ApiErrorType,
  message: string,
  status?: number,
  details?: Array<{ field: string; message: string }>
): NextResponse<ApiErrorResponse> {
  const appError = createAppError(error, message, status, details);
  
  // 統一ログ出力
  logApiError(appError, {
    user_agent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
  });

  // 既存のレスポンス形式を維持
  return NextResponse.json(
    {
      success: false,
      error,
      message,
      ...(details && { details }),
    },
    { 
      status: appError.statusCode, 
      headers: CORS_HEADERS 
    }
  );
}

/**
 * 拡張エラーレスポンス生成（ヒント付き）
 * 
 * @param error エラーコード
 * @param message エラーメッセージ
 * @param hint ユーザー向けヒント
 * @param status HTTPステータスコード
 * @returns NextResponse
 */
export function createErrorResponseWithHint(
  error: ApiErrorType,
  message: string,
  hint: string,
  status?: number
): NextResponse {
  const appError = createAppError(error, message, status, undefined, hint);
  
  logApiError(appError, { has_hint: true });

  return NextResponse.json(
    {
      success: false,
      error,
      message,
      hint,
    },
    { 
      status: appError.statusCode, 
      headers: CORS_HEADERS 
    }
  );
}

/**
 * よく使用されるエラーレスポンスのファクトリー関数
 */
export const CommonErrors = {
  rateLimited: (customMessage?: string) => 
    createErrorResponse(
      'rate_limited', 
      customMessage ?? 'リクエストが多すぎます。しばらく待ってからお試しください'
    ),
    
  unauthorized: (customMessage?: string) =>
    createErrorResponse(
      'unauthorized',
      customMessage ?? 'ログインが必要です',
      401
    ),
    
  invalidRequest: (customMessage?: string) =>
    createErrorResponse(
      'invalid_request',
      customMessage ?? 'リクエストが無効です'
    ),
    
  serverError: (customMessage?: string) =>
    createErrorResponse(
      'server_error',
      customMessage ?? 'サーバーエラーが発生しました',
      500
    ),
    
  notFound: (customMessage?: string) =>
    createErrorResponse(
      'not_found',
      customMessage ?? 'リソースが見つかりません',
      404
    ),
} as const;

/**
 * バリデーションエラー専用ヘルパー
 */
export function createValidationErrorResponse(
  errors: Array<{ field: string; message: string }>
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    'validation_failed',
    '入力データに不備があります',
    400,
    errors
  );
}

// 既存との互換性は上記の型定義で保証済み