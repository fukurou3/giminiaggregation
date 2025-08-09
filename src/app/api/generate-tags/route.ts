import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { TagGenerationService } from "@/lib/ai/service";
import { CONFIG, validateConfig } from "@/lib/config";
import { allow, getClientIP, createRateLimitHeaders, getRateLimitKey } from "../_middleware/rate";
import { requireAuth } from "../_middleware/auth";
import { logEvent, logError, PerformanceTimer } from "@/lib/observability";

// Node.js ランタイム固定（Admin SDK 対応）
export const runtime = "nodejs";

// 共通CORS設定を使用
import { corsHeaders, handleOptions, handleMethodNotAllowed } from "../_middleware/cors";

// OPTIONS リクエスト処理（CORS プリフライト）
export async function OPTIONS() {
  return handleOptions();
}

// GET/PUT/DELETE メソッドを明示的に禁止
export async function GET() {
  return handleMethodNotAllowed();
}

export async function PUT() {
  return handleMethodNotAllowed();
}

export async function DELETE() {
  return handleMethodNotAllowed();
}

// 設定値の妥当性を起動時にチェック
try {
  validateConfig();
} catch (error) {
  console.error("Configuration validation failed:", error);
}

// 入力セキュリティ強化のためのスキーマ
const bodySchema = z.object({
  title: z.string()
    .min(1, "タイトルは必須です")
    .max(120, "タイトルは120文字以内で入力してください")
    .transform(str => str.trim())
    .refine(str => Buffer.byteLength(str, 'utf8') <= 500, {
      message: "タイトルのバイト数が制限を超えています（500バイト以内）"
    }),
  description: z.string()
    .max(500, "説明は500文字以内で入力してください")
    .transform(str => str.trim())
    .refine(str => Buffer.byteLength(str, 'utf8') <= 2000, {
      message: "説明のバイト数が制限を超えています（2000バイト以内）"
    })
    .optional(),
  max: z.number().int().min(1).max(5, "タグ数は1-5個の範囲で指定してください").optional().default(5),
  locale: z.enum(["ja", "en"]).optional().default("ja"),
  existingTags: z.array(
    z.string()
      .max(50, "タグ名は50文字以内にしてください")
      .transform(str => str.trim())
      .refine(str => str.length > 0, { message: "空のタグは除外されます" })
  ).max(400, "既存タグは400件以内で送信してください").optional().default([]),
});

// API レスポンススキーマ（型安全性とバージョン管理）
const responseSchema = z.object({
  version: z.literal("1.0"),
  timestamp: z.string(),
  picked: z.array(z.string()),
  fresh: z.array(z.string()),
  all: z.array(z.string()),
  meta: z.object({
    total_count: z.number().int().nonnegative(),
    picked_count: z.number().int().nonnegative(),
    fresh_count: z.number().int().nonnegative(),
    request_id: z.string(),
  }),
});

export async function POST(req: NextRequest) {
  const timer = new PerformanceTimer('generate_tags_api');
  const clientIP = getClientIP(req);
  let auth = null;
  
  try {
    // 認証チェック（最優先）
    const authResult = await requireAuth(req);
    auth = authResult.auth;
    const authError = authResult.error;
    
    if (authError || !auth) {
      return NextResponse.json(
        { error: authError?.message || "認証が必要です" },
        { status: authError?.status || 401, headers: corsHeaders }
      );
    }

    // 認証ユーザー単位でレート制限チェック
    const rateLimitKey = getRateLimitKey(auth.uid, clientIP);
    
    if (!allow(rateLimitKey)) {
      const rateLimitHeaders = createRateLimitHeaders(rateLimitKey, CONFIG.RATE_LIMIT_MAX, true);
      
      logEvent('rate_limit_exceeded', {
        level: 'warn',
        uid: auth.uid,
        client_ip: clientIP,
        user_agent: req.headers.get('user-agent') || 'unknown',
        retry_after: rateLimitHeaders['Retry-After'] || 'unknown',
      });
      
      return NextResponse.json(
        { 
          error: "レート制限に達しました。しばらく時間をおいてから再試行してください。",
          retryAfter: parseInt(rateLimitHeaders['Retry-After'] || '60', 10) // クライアント側で使用
        },
        { 
          status: 429,
          headers: { ...rateLimitHeaders, ...corsHeaders }
        }
      );
    }
    
    // リクエストサイズの事前チェック（DoS攻撃防止）
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 100000) { // 100KB制限
      return NextResponse.json(
        { error: "リクエストサイズが大きすぎます（100KB以内）" },
        { status: 413, headers: corsHeaders } // Payload Too Large
      );
    }
    
    // リクエストボディのバリデーション（入力セキュリティ強化済み）
    const rawBody = await req.json();
    const validatedData = bodySchema.parse(rawBody);
    
    // リクエストログ（認証ユーザー情報付き）
    logEvent('generate_tags_request', {
      uid: auth.uid,
      client_ip: clientIP,
      title_length: validatedData.title.length,
      description_length: validatedData.description?.length || 0,
      max_tags: validatedData.max,
      locale: validatedData.locale,
      has_existing_tags: validatedData.existingTags.length > 0,
      existing_tags_count: validatedData.existingTags.length,
      user_agent: req.headers.get('user-agent') || 'unknown',
    });
    
    // タグ生成サービスを呼び出し
    const result = await TagGenerationService.generateTags(validatedData);
    
    // サーバー側でさらに重複防止処理（念のため）
    const { normalizeTags, toSlug } = await import('@/lib/tags/normalize');
    const normalizedPicked = normalizeTags(result.picked);
    const normalizedFresh = normalizeTags(result.fresh);
    
    // slug レベルでの重複除去
    const allSlugs = new Set<string>();
    const finalPicked = normalizedPicked.filter(tag => {
      const slug = toSlug(tag);
      if (allSlugs.has(slug)) return false;
      allSlugs.add(slug);
      return true;
    });
    
    const finalFresh = normalizedFresh.filter(tag => {
      const slug = toSlug(tag);
      if (allSlugs.has(slug)) return false;
      allSlugs.add(slug);
      return true;
    });
    
    // API レスポンス安定化（スキーマバージョン付き）
    const finalResult = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      picked: finalPicked,
      fresh: finalFresh,
      all: [...finalPicked, ...finalFresh],
      meta: {
        total_count: finalPicked.length + finalFresh.length,
        picked_count: finalPicked.length,
        fresh_count: finalFresh.length,
        request_id: crypto.randomUUID(),
      }
    };
    
    // レスポンスヘッダーにレート制限情報を追加
    const rateLimitHeaders = createRateLimitHeaders(rateLimitKey);
    
    // レスポンススキーマ検証（型安全性保証）
    const validatedResponse = responseSchema.parse(finalResult);
    
    // 成功時の計測終了
    timer.end({
      success: true,
      result_count: validatedResponse.all.length,
      picked_count: validatedResponse.picked.length,
      fresh_count: validatedResponse.fresh.length,
      uid: auth.uid,
      client_ip: clientIP,
      api_version: validatedResponse.version,
    });
    
    return NextResponse.json(validatedResponse, {
      headers: { ...rateLimitHeaders, ...corsHeaders }
    });
    
  } catch (error: unknown) {
    // エラー時の計測終了
    const duration = timer.end({
      success: false,
      uid: auth?.uid,
      client_ip: clientIP,
    });
    
    // 詳細エラーログ
    logError(error, {
      ip: clientIP,
      userAgent: req.headers.get('user-agent') || 'unknown',
    }, {
      operation: 'generate_tags_api',
      duration_ms: duration,
    });
    
    // バリデーションエラーかAIサービスエラーかを判別
    let status = 500;
    let message = "内部サーバーエラーが発生しました";
    
    if (error instanceof z.ZodError) {
      status = 400;
      message = `入力データが無効です: ${error.issues.map((e) => e.message).join(', ')}`;
    } else if (error instanceof Error) {
      if (error.message.includes("GOOGLE_GENAI_API_KEY")) {
        status = 500;
        message = "AI サービスの設定に問題があります";
      } else if (error.message.includes("タグ生成に失敗しました")) {
        status = 503;
        message = "AI サービスが一時的に利用できません。しばらく時間をおいてから再試行してください。";
      } else {
        message = error.message;
      }
    }
    
    const rateLimitHeaders = createRateLimitHeaders(getRateLimitKey(auth?.uid, clientIP));
    
    return NextResponse.json(
      { error: message },
      { 
        status,
        headers: { ...rateLimitHeaders, ...corsHeaders }
      }
    );
  }
}