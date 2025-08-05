// Configuration constants
const VALIDATION_CONFIG = {
  TIMEOUT_MS: 5000,
  USER_AGENT: 'Mozilla/5.0 (compatible; Gemini-Aggregation-Bot/1.0)',
} as const;

// Error messages
const ERROR_MESSAGES = {
  INVALID_FORMAT: 'Geminiの共有リンク形式ではありません',
  NOT_FOUND: 'このCanvasリンクは存在しないようです',
  NOT_ACCESSIBLE: '共有設定が限定公開か、削除されているようです',
  SERVER_ERROR: 'サーバーエラーが発生しました',
  TIMEOUT: '確認がタイムアウトしました。もう一度お試しください',
  CONNECTION_FAILED: '接続に失敗しました。ネットワークを確認してください',
  CANVAS_NOT_ACCESSIBLE: 'このCanvasリンクは存在しないか、アクセスできません',
  VALID: '有効なCanvasリンクです',
} as const;

export interface ValidationResult {
  isValid: boolean;
  status: 'valid' | 'invalid_format' | 'not_found' | 'not_accessible' | 'timeout' | 'server_error';
  message: string;
  ogpData?: {
    title?: string;
    description?: string;
    image?: string;
  };
}

export function isValidGeminiURL(url: string): boolean {
  const geminiUrlPattern = /^https:\/\/(gemini\.google\.com\/share\/[a-zA-Z0-9_-]+|g\.co\/gemini\/share\/[a-zA-Z0-9_-]+)$/;
  return geminiUrlPattern.test(url);
}

export async function validateGeminiUrl(url: string): Promise<ValidationResult> {
  // まず形式チェック
  if (!isValidGeminiURL(url)) {
    return {
      isValid: false,
      status: 'invalid_format',
      message: ERROR_MESSAGES.INVALID_FORMAT
    };
  }

  try {
    // タイムアウト設定（5秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VALIDATION_CONFIG.TIMEOUT_MS);

    // HTTP ステータスチェック
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': VALIDATION_CONFIG.USER_AGENT
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          isValid: false,
          status: 'not_found',
          message: ERROR_MESSAGES.NOT_FOUND
        };
      } else if (response.status === 403 || response.status === 401) {
        return {
          isValid: false,
          status: 'not_accessible',
          message: ERROR_MESSAGES.NOT_ACCESSIBLE
        };
      } else {
        return {
          isValid: false,
          status: 'server_error',
          message: ERROR_MESSAGES.SERVER_ERROR
        };
      }
    }

    // OGP取得とCanvas存在確認のためのGETリクエスト
    const ogpResult = await fetchOGPData(url, controller);
    
    // OGPデータが取得できない場合は存在しないと判定
    if (!ogpResult || !ogpResult.title) {
      return {
        isValid: false,
        status: 'not_found',
        message: ERROR_MESSAGES.CANVAS_NOT_ACCESSIBLE
      };
    }
    
    return {
      isValid: true,
      status: 'valid',
      message: ERROR_MESSAGES.VALID,
      ogpData: ogpResult
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        isValid: false,
        status: 'timeout',
        message: ERROR_MESSAGES.TIMEOUT
      };
    }

    return {
      isValid: false,
      status: 'server_error',
      message: ERROR_MESSAGES.CONNECTION_FAILED
    };
  }
}

async function fetchOGPData(url: string, controller: AbortController): Promise<ValidationResult['ogpData']> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': VALIDATION_CONFIG.USER_AGENT
      }
    });

    if (!response.ok) {
      return undefined;
    }

    const html = await response.text();
    
    // 基本的なOGPデータを抽出
    const ogpData: ValidationResult['ogpData'] = {};
    
    // title取得
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"[^>]*>/i) ||
                      html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      ogpData.title = titleMatch[1].trim();
    }

    // description取得  
    const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"[^>]*>/i) ||
                      html.match(/<meta\s+name="description"\s+content="([^"]*)"[^>]*>/i);
    if (descMatch) {
      ogpData.description = descMatch[1].trim();
    }

    // image取得
    const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"[^>]*>/i);
    if (imageMatch) {
      ogpData.image = imageMatch[1].trim();
    }

    // 実際のCanvas投稿の存在をチェック
    const hasValidCanvas = 
      // 有効なOGPタイトルが存在し、デフォルトのGeminiページでない
      (ogpData.title && 
       ogpData.title !== 'Gemini' && 
       ogpData.title.trim() !== '' &&
       !ogpData.title.includes('Google AI') &&
       !ogpData.title.includes('404')) ||
      // 特定の投稿IDが含まれている（存在しない場合は一般的なページ）
      html.includes('"conversationId"') ||
      html.includes('"shareId"') ||
      // Canvasの具体的なコンテンツを示すマーカー
      html.includes('canvas-content') ||
      html.includes('streamlit-container');

    if (!hasValidCanvas) {
      console.warn('有効なCanvas投稿が検出されませんでした:', url);
      return undefined; // OGPデータを返さない = 無効と判定
    }

    return ogpData;
  } catch (error) {
    console.error('OGP取得エラー:', error);
    return undefined;
  }
}