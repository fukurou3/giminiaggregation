import { NextRequest, NextResponse } from 'next/server';
import { validateGeminiUrl, ValidationResult } from '@/lib/validators/urlValidator';
import { getClientIP, CORS_HEADERS } from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';

// キャッシュの有効期間（5分）
const CACHE_TTL_MS = 5 * 60 * 1000;

// バリデーション結果のキャッシュ
const validationCache = new Map<string, { result: ValidationResult; expiry: number }>();

// 期限切れエントリを削除
function cleanupCache() {
  const now = Date.now();
  for (const [key, { expiry }] of validationCache.entries()) {
    if (expiry <= now) {
      validationCache.delete(key);
    }
  }
}

// 定期的にキャッシュをクリーンアップ
setInterval(cleanupCache, CACHE_TTL_MS);

function getCachedResult(url: string): ValidationResult | null {
  cleanupCache();
  const cached = validationCache.get(url);
  if (cached && Date.now() < cached.expiry) {
    return cached.result;
  }
  return null;
}

function setCachedResult(url: string, result: ValidationResult) {
  cleanupCache();
  const expiry = Date.now() + CACHE_TTL_MS;
  validationCache.set(url, { result, expiry });

  // キャッシュサイズ制限（最大100エントリ）
  if (validationCache.size > 100) {
    const firstKey = validationCache.keys().next().value;
    if (firstKey) {
      validationCache.delete(firstKey);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.json();
    const { url } = body;

    // URLが提供されているかチェック
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        {
          isValid: false,
          status: 'invalid_format',
          message: 'URLが提供されていません'
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // IPアドレスを取得
    const ip = getClientIP(request);

    // レート制限チェック
    if (!(await checkRateLimit(ip))) {
      return NextResponse.json(
        {
          isValid: false,
          status: 'rate_limited',
          message: 'リクエストが多すぎます。しばらく待ってからお試しください'
        },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    // キャッシュから結果を取得
    const cachedResult = getCachedResult(url);
    if (cachedResult) {
      return NextResponse.json(cachedResult, { headers: CORS_HEADERS });
    }

    // URLバリデーションを実行
    const result = await validateGeminiUrl(url);
    
    // 結果をキャッシュに保存（有効な場合のみ）
    if (result.isValid) {
      setCachedResult(url, result);
    }

    // ログ出力（セキュリティ監査用）
    console.log(`URL validation: ${url} - ${result.status} - IP: ${ip}`);

    return NextResponse.json(result, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('URL validation error:', error);
    
    return NextResponse.json(
      {
        isValid: false,
        status: 'server_error',
        message: 'サーバーエラーが発生しました'
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// OPTIONS メソッド（プリフライトリクエスト）のハンドリング
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}