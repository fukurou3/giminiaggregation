/**
 * AI API共通基盤
 * - エラーハンドリング
 - 認証
 * - レスポンス正規化
 * - タイムアウト制御
 */

/**
 * AI APIの共通エラー型
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'AUTH_ERROR' | 'RATE_LIMIT' | 'TIMEOUT' | 'PARSE_ERROR' | 'API_ERROR',
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

/**
 * AI APIの共通設定
 */
export interface AIServiceConfig {
  timeout: number;
  maxRetries: number;
}

/**
 * AI APIリクエスト結果の共通型
 */
export interface AIServiceResult<T> {
  data: T;
  timestamp: string;
  processingTime: number;
}

/**
 * JSON抽出の共通ユーティリティ
 */
export function extractJSON(rawText: string): string {
  let jsonStr = rawText.trim();
  
  // マークダウンコードブロックを除去
  if (jsonStr.startsWith('```json\n') && jsonStr.endsWith('\n```')) {
    jsonStr = jsonStr.slice(8, -4).trim();
  } else if (jsonStr.startsWith('```\n') && jsonStr.endsWith('\n```')) {
    jsonStr = jsonStr.slice(4, -4).trim();
  }
  
  // JSON部分を抽出（最後の{...}パターンを探す）
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  return jsonMatch?.[0] ?? jsonStr;
}

/**
 * Firebase認証トークン取得の共通関数
 */
export async function getAuthToken(): Promise<string> {
  const { getAuth } = await import("firebase/auth");
  const auth = getAuth();
  const idToken = await auth.currentUser?.getIdToken?.();
  
  if (!idToken) {
    throw new AIServiceError("認証が必要です", 'AUTH_ERROR');
  }
  
  return idToken;
}

/**
 * AIサービスの基底クラス
 */
export abstract class BaseAIService {
  protected readonly config: AIServiceConfig;
  
  constructor(config: Partial<AIServiceConfig> = {}) {
    this.config = {
      timeout: 20000, // 20秒
      maxRetries: 1,
      ...config
    };
  }

  /**
   * AI API呼び出しの共通処理
   */
  protected async callAI<TResponse>(
    endpoint: string,
    payload: Record<string, unknown>,
    parser: (rawText: string) => TResponse
  ): Promise<AIServiceResult<TResponse>> {
    const startTime = Date.now();
    
    // タイムアウト制御
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.config.timeout);

    try {
      const authToken = await getAuthToken();
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      if (!response.ok) {
        await this.handleAPIError(response);
      }

      const rawText = await response.text();
      const data = parser(rawText);
      
      return {
        data,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AIServiceError("リクエストがタイムアウトしました", 'TIMEOUT');
      }
      
      throw new AIServiceError(
        error instanceof Error ? error.message : "AIサービスエラー",
        'API_ERROR'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * API応答エラーのハンドリング
   */
  private async handleAPIError(response: Response): Promise<never> {
    if (response.status === 429) {
      const errorData = await response.json().catch(() => ({}));
      const waitTime = errorData.retryAfter || 60;
      throw new AIServiceError(
        `アクセスが集中しています。${waitTime}秒後に再試行してください。`,
        'RATE_LIMIT',
        waitTime
      );
    } 
    
    if (response.status === 401) {
      throw new AIServiceError("認証エラー：再ログインしてください。", 'AUTH_ERROR');
    }
    
    throw new AIServiceError(`APIエラー: ${response.status}`, 'API_ERROR');
  }
}