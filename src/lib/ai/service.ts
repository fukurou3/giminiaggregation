import { createAIClient } from './client';
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
export class TagGenerationService {
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
   * タイムアウト付き実行
   */
  private static async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`AI request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 指数バックオフによるリトライ処理
   */
  private static async withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = CONFIG.MAX_RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          break;
        }
        
        // 指数バックオフ: 1秒、2秒、4秒...
        const delay = CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        logEvent('ai_request_retry', {
          attempt,
          delay_ms: delay,
          error_message: lastError.message,
        });
      }
    }
    
    throw lastError!;
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
      
      // AI クライアントを作成
      const aiClient = createAIClient();
      const prompt = buildTagGenerationPrompt(promptInput);
      
      // リトライ付きでAI呼び出し（サーバー側タイムアウト付き）
      const rawResponse = await this.withRetry(async () => {
        const aiStartTime = Date.now();
        const response = await this.withTimeout(
          () => aiClient.generateText(prompt),
          CONFIG.AI_TIMEOUT_MS
        );
        const aiDuration = Date.now() - aiStartTime;
        
        // AI APIの使用ログ
        logAIRequest(
          CONFIG.MODEL_ID,
          prompt.length, // 簡易的な入力トークン数
          response.length, // 簡易的な出力トークン数
          aiDuration,
          true
        );
        
        return response;
      });
      
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