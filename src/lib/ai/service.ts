import { createAIClient } from './client';
import { BaseAIService } from './base';
import { buildTagGenerationPrompt, type TagGenerationInput } from './prompt';
import { parseTagResponse, sanitizeStringArray } from './parser';
import { TagRepository } from '@/lib/tags/repository';
import { normalizeTags, toSlug } from '@/lib/tags/normalize';
import { CONFIG } from '@/lib/config';
import { logEvent, logError, logAIRequest, logTagGeneration } from '@/lib/observability';

/**
 * タグ生成結果の型
 */
export interface TagGenerationResult {
  picked: string[];
  fresh: string[];
  all: string[];
}

/**
 * タグ生成リクエストの型
 */
export interface GenerateTagsRequest {
  title: string;
  description?: string;
  max: number;
  locale?: "ja" | "en";
  existingTags?: string[];
}

/**
 * キャッシュエントリの型
 */
interface CacheEntry {
  value: TagGenerationResult;
  timestamp: number;
}

/**
 * インメモリキャッシュ（同一リクエスト連打の吸収）
 * 注意：サーバーレス環境では各インスタンスで独立したキャッシュを持つ
 * 本格的なキャッシュが必要な場合は Redis 等の外部ストレージを検討
 */
const cache = new Map<string, CacheEntry>();

// サーバーレス環境での起動時ログ
if (process.env.NODE_ENV === 'production') {
  logEvent('cache_instance_init', {
    instance_id: process.env.VERCEL_DEPLOYMENT_ID || 'unknown',
    cache_type: 'in_memory',
    warning: 'Each serverless instance has its own cache',
  });
}

/**
 * タグ生成サービス
 * AI を使ったタグ生成のユースケースを実装
 * リトライ機能、キャッシュ、ログ機能付き
 */
export class TagGenerationService extends BaseAIService {
  /**
   * キャッシュキーを生成
   */
  private static createCacheKey(input: TagGenerationInput): string {
    return JSON.stringify([
      input.title.trim().toLowerCase(),
      input.description?.trim().toLowerCase() || '',
      input.existingTags.slice(0, 200), // キャッシュキーを合理的なサイズに制限
      input.maxTags,
      input.locale
    ]);
  }

  /**
   * キャッシュのクリーンアップ（古いエントリを削除）
   */
  private static cleanupCache(): void {
    const now = Date.now();
    const expired: string[] = [];
    
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > CONFIG.CACHE_TTL_MS) {
        expired.push(key);
      }
    }
    
    expired.forEach(key => cache.delete(key));
    
    // サイズ制限も適用
    if (cache.size > CONFIG.CACHE_MAX_SIZE) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, cache.size - CONFIG.CACHE_MAX_SIZE);
      toDelete.forEach(([key]) => cache.delete(key));
    }
  }

  /**
   * タイトルと説明からタグを生成
   * 既存の人気タグを優先し、足りない分だけ新規タグを作成
   * キャッシュ、リトライ、ログ機能付き
   */
  static async generateTags(request: GenerateTagsRequest): Promise<TagGenerationResult> {
    const startTime = Date.now();
    const { title, description = "", max = 5, locale = "ja" } = request;
    
    try {
      // 既存タグを取得（引数で指定されたものまたはFirestoreから取得）
      let existingTags = request.existingTags || await TagRepository.fetchExistingTags();
      
      // コスト制御：既存タグを最大400件に制限（最終防衛）
      if (existingTags.length > 400) {
        existingTags = existingTags.slice(0, 400);
        logEvent('existing_tags_limited', {
          original_count: request.existingTags?.length || 'fetched',
          limited_count: 400,
        });
      }
      
      // プロンプト入力を構築
      const promptInput: TagGenerationInput = {
        title: title.trim(),
        description: description.trim(),
        existingTags,
        maxTags: max,
        locale
      };
      
      // キャッシュチェック
      const cacheKey = this.createCacheKey(promptInput);
      const cached = cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL_MS) {
        logEvent('tag_generation_cache_hit', {
          duration_ms: Date.now() - startTime,
          cache_age_ms: Date.now() - cached.timestamp,
          instance_id: process.env.VERCEL_DEPLOYMENT_ID || 'unknown',
          cache_size: cache.size,
        });
        return cached.value;
      }
      
      // AI クライアントを作成してプロンプトを実行
      const aiClient = createAIClient();
      const prompt = buildTagGenerationPrompt(promptInput);
      
      // AI実行（統一されたタイムアウトとエラーハンドリングを使用）
      const aiStartTime = Date.now();
      const rawResponse = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("AI request timed out")), CONFIG.AI_TIMEOUT_MS);
        
        aiClient.generateText(prompt)
          .then(response => {
            clearTimeout(timeout);
            resolve(response);
          })
          .catch(error => {
            clearTimeout(timeout);
            reject(error);
          });
      });
      
      const aiDuration = Date.now() - aiStartTime;
      
      // AI APIの使用ログ
      logAIRequest(
        CONFIG.MODEL_ID,
        prompt.length, // 簡易的な入力トークン数
        rawResponse.length, // 簡易的な出力トークン数
        aiDuration,
        true
      );
      
      // レスポンスを解析
      const parsedResponse = parseTagResponse(rawResponse);
      const rawPicked = sanitizeStringArray(parsedResponse.picked);
      const rawFresh = sanitizeStringArray(parsedResponse.new);
      
      // 既存タグのスラグセットを作成
      const existingSet = new Set(existingTags.map(toSlug));
      
      // picked タグ: 既存タグに含まれるもののみ
      const picked = normalizeTags(rawPicked)
        .filter((tag) => existingSet.has(toSlug(tag)))
        .slice(0, max);
      
      // fresh タグ: 既存タグに含まれない新規タグ
      const remain = Math.max(0, max - picked.length);
      const fresh = normalizeTags(rawFresh)
        .filter((tag) => !existingSet.has(toSlug(tag)))
        .slice(0, remain);
      
      const result: TagGenerationResult = {
        picked,
        fresh,
        all: [...picked, ...fresh]
      };
      
      // キャッシュに保存
      cache.set(cacheKey, {
        value: result,
        timestamp: Date.now()
      });
      
      // 定期的なキャッシュクリーンアップ
      if (Math.random() < 0.1) { // 10%の確率で実行
        this.cleanupCache();
      }
      
      // 成功ログ
      logTagGeneration(
        result.all.length,
        result.picked.length,
        result.fresh.length,
        Date.now() - startTime
      );
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logError(error, {}, {
        operation: 'generateTags',
        title_length: title.length, // タイトルの長さのみ記録（プライバシー配慮）
        duration_ms: duration,
      });
      
      // AI API エラーのログ
      logAIRequest(
        CONFIG.MODEL_ID,
        0, 0, duration, false
      );
      
      throw new Error("タグ生成に失敗しました");
    }
  }
}

/**
 * コーチングアドバイス結果の型
 */
export interface CoachResult {
  advice: {
    refinedOverview: string;
    headlineIdeas: string[];
    goodPoints: string[];
  };
  questionnaire: Array<{
    field: "problem" | "background" | "scenes" | "users" | "differentiation" | "extensions";
    question: string;
  }>;
}

/**
 * コーチングリクエストの型
 */
export interface GenerateCoachRequest {
  title: string;
  category: string;
  tags: string[];
  overview: string;
  optional: {
    problem?: string;
    background?: string;
    scenes?: string;
    users?: string;
    differentiation?: string;
    extensions?: string;
  };
  appUrl?: string;
  locale?: "ja" | "en";
}

/**
 * AIコーチングサービス
 * AI を使った作品概要改善アドバイスのユースケースを実装
 */
export class CoachService extends BaseAIService {
  /**
   * 作品概要からコーチングアドバイスを生成
   */
  static async generateCoachAdvice(request: GenerateCoachRequest): Promise<CoachResult> {
    const startTime = Date.now();
    
    try {
      // プロンプト入力を構築
      const { buildCoachPrompt, CoachInput } = await import('./prompt');
      const promptInput: CoachInput = {
        title: request.title.trim(),
        category: request.category,
        tags: request.tags,
        overview: request.overview.trim(),
        optional: request.optional,
        appUrl: request.appUrl,
        locale: request.locale || "ja"
      };
      
      // AI クライアントを作成してプロンプトを実行
      const aiClient = createAIClient();
      const prompt = buildCoachPrompt(promptInput);
      
      // AI実行（統一されたタイムアウトとエラーハンドリングを使用）
      const aiStartTime = Date.now();
      const rawResponse = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("AI request timed out")), CONFIG.AI_TIMEOUT_MS);
        
        aiClient.generateText(prompt, { maxOutputTokens: 1024 }) // コーチング用に出力量を増加
          .then(response => {
            clearTimeout(timeout);
            resolve(response);
          })
          .catch(error => {
            clearTimeout(timeout);
            reject(error);
          });
      });
      
      const aiDuration = Date.now() - aiStartTime;
      
      // AI APIの使用ログ
      logAIRequest(
        CONFIG.MODEL_ID,
        prompt.length,
        rawResponse.length,
        aiDuration,
        true
      );
      
      // レスポンスを解析
      const { parseCoachResponse } = await import('./parser');
      const parsedResponse = parseCoachResponse(rawResponse);
      
      // 成功ログ
      logEvent('coach_advice_generated', {
        duration_ms: Date.now() - startTime,
        ai_duration_ms: aiDuration,
        title_length: request.title.length,
        overview_length: request.overview.length,
        questionnaire_count: parsedResponse.questionnaire.length,
      });
      
      return parsedResponse;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logError(error, {}, {
        operation: 'generateCoachAdvice',
        title_length: request.title.length,
        overview_length: request.overview.length,
        duration_ms: duration,
      });
      
      // AI API エラーのログ
      logAIRequest(
        CONFIG.MODEL_ID,
        0, 0, duration, false
      );
      
      throw new Error("AIコーチング機能でエラーが発生しました");
    }
  }
}
