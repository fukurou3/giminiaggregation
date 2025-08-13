import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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
  category: z.string()
    .min(1, "カテゴリは必須です")
    .max(50, "カテゴリは50文字以内で入力してください")
    .transform(str => str.trim()),
  tags: z.array(
    z.string()
      .max(50, "タグ名は50文字以内にしてください")
      .transform(str => str.trim())
      .refine(str => str.length > 0, { message: "空のタグは除外されます" })
  ).max(10, "タグは10件以内で送信してください").optional().default([]),
  overview: z.string()
    .min(1, "作品概要は必須です")
    .max(1000, "作品概要は1000文字以内で入力してください")
    .transform(str => str.trim())
    .refine(str => Buffer.byteLength(str, 'utf8') <= 3000, {
      message: "作品概要のバイト数が制限を超えています（3000バイト以内）"
    }),
  optional: z.object({
    problem: z.string().max(500).optional(),
    background: z.string().max(500).optional(),
    scenes: z.string().max(500).optional(),
    users: z.string().max(500).optional(),
    differentiation: z.string().max(500).optional(),
    extensions: z.string().max(500).optional(),
  }).optional().default({}),
  appUrl: z.string().url().optional().or(z.literal("")),
  locale: z.enum(["ja", "en"]).optional().default("ja"),
});

// API レスポンススキーマ（型安全性とバージョン管理）
const responseSchema = z.object({
  version: z.literal("1"),
  timestamp: z.string(),
  advice: z.object({
    refinedOverview: z.string(),
    headlineIdeas: z.array(z.string()).length(3),
    goodPoints: z.array(z.string()).length(3),
  }),
  questionnaire: z.array(z.object({
    field: z.enum(["problem", "background", "scenes", "users", "differentiation", "extensions"]),
    question: z.string(),
  })).max(5),
});

export async function POST(req: NextRequest) {
  const timer = new PerformanceTimer('coach_draft_api');
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
          retryAfter: parseInt(rateLimitHeaders['Retry-After'] || '60', 10)
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
        { status: 413, headers: corsHeaders }
      );
    }
    
    // リクエストボディのバリデーション（入力セキュリティ強化済み）
    const rawBody = await req.json();
    const validatedData = bodySchema.parse(rawBody);
    
    // リクエストログ（認証ユーザー情報付き）
    logEvent('coach_draft_request', {
      uid: auth.uid,
      client_ip: clientIP,
      title_length: validatedData.title.length,
      overview_length: validatedData.overview.length,
      category: validatedData.category,
      tags_count: validatedData.tags.length,
      has_optional_fields: Object.keys(validatedData.optional).length > 0,
      locale: validatedData.locale,
      user_agent: req.headers.get('user-agent') || 'unknown',
    });
    
    // AI コーチサービスを呼び出し (統合されたサービスを使用)
    const { CoachService } = await import('@/lib/ai/service');
    
    const aiResult = await CoachService.generateCoachAdvice({
      title: validatedData.title,
      category: validatedData.category,
      tags: validatedData.tags,
      overview: validatedData.overview,
      optional: validatedData.optional,
      appUrl: validatedData.appUrl,
      locale: validatedData.locale,
    });
    
    const mockResult = {
      version: "1" as const,
      timestamp: new Date().toISOString(),
      advice: aiResult.advice,
      questionnaire: aiResult.questionnaire,
    };
    
    // レスポンスヘッダーにレート制限情報を追加
    const rateLimitHeaders = createRateLimitHeaders(rateLimitKey);
    
    // レスポンススキーマ検証（型安全性保証）
    const validatedResponse = responseSchema.parse(mockResult);
    
    // 成功時の計測終了
    timer.end({
      success: true,
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
      operation: 'coach_draft_api',
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
      } else if (error.message.includes("アドバイス生成に失敗しました")) {
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