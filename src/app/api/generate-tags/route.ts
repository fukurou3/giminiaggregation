import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TagGenerationService } from "@/lib/ai/service";
import { CONFIG, validateConfig } from "@/lib/config";
import { allow, getClientIP, createRateLimitHeaders } from "../_middleware/rate";
import { logEvent, logError, PerformanceTimer } from "@/lib/observability";

// 設定値の妥当性を起動時にチェック
try {
  validateConfig();
} catch (error) {
  console.error("Configuration validation failed:", error);
}

const bodySchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  max: z.number().int().min(1).max(CONFIG.MAX_TAGS).optional().default(5),
  locale: z.enum(["ja", "en"]).optional().default("ja"),
  existingTags: z.array(z.string()).optional().default([]),
});

export async function POST(req: NextRequest) {
  const timer = new PerformanceTimer('generate_tags_api');
  const clientIP = getClientIP(req);
  
  try {
    // レート制限チェック
    if (!allow(clientIP)) {
      const rateLimitHeaders = createRateLimitHeaders(clientIP);
      
      logEvent('rate_limit_exceeded', {
        level: 'warn',
        client_ip: clientIP,
        user_agent: req.headers.get('user-agent') || 'unknown',
      });
      
      return NextResponse.json(
        { error: "レート制限に達しました。しばらく時間をおいてから再試行してください。" },
        { 
          status: 429,
          headers: rateLimitHeaders
        }
      );
    }
    
    // リクエストボディのバリデーション
    const validatedData = bodySchema.parse(await req.json());
    
    // リクエストログ
    logEvent('generate_tags_request', {
      client_ip: clientIP,
      title_length: validatedData.title.length,
      description_length: validatedData.description?.length || 0,
      max_tags: validatedData.max,
      locale: validatedData.locale,
      has_existing_tags: validatedData.existingTags.length > 0,
      user_agent: req.headers.get('user-agent') || 'unknown',
    });
    
    // タグ生成サービスを呼び出し
    const result = await TagGenerationService.generateTags(validatedData);
    
    // レスポンスヘッダーにレート制限情報を追加
    const rateLimitHeaders = createRateLimitHeaders(clientIP);
    
    // 成功時の計測終了
    timer.end({
      success: true,
      result_count: result.all.length,
      picked_count: result.picked.length,
      fresh_count: result.fresh.length,
      client_ip: clientIP,
    });
    
    return NextResponse.json(result, {
      headers: rateLimitHeaders
    });
    
  } catch (error: unknown) {
    // エラー時の計測終了
    const duration = timer.end({
      success: false,
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
      message = `入力データが無効です: ${error.issues.map((e: any) => e.message).join(', ')}`;
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
    
    const rateLimitHeaders = createRateLimitHeaders(clientIP);
    
    return NextResponse.json(
      { error: message },
      { 
        status,
        headers: rateLimitHeaders
      }
    );
  }
}