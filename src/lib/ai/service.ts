import { createAIClient } from './client';
import { buildTagGenerationPrompt, type TagGenerationInput } from './prompt';
import { parseTagResponse, sanitizeStringArray } from './parser';
import { TagRepository } from '@/lib/tags/repository';
import { normalizeTags, toSlug } from '@/lib/tags/normalize';

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
 * タグ生成サービス
 * AI を使ったタグ生成のユースケースを実装
 */
export class TagGenerationService {
  /**
   * タイトルと説明からタグを生成
   * 既存の人気タグを優先し、足りない分だけ新規タグを作成
   */
  static async generateTags(request: GenerateTagsRequest): Promise<TagGenerationResult> {
    const { title, description = "", max = 5, locale = "ja" } = request;
    
    // 既存タグを取得（引数で指定されたものまたはFirestoreから取得）
    const existingTags = request.existingTags || await TagRepository.getExistingTagsForAI();
    
    // AIクライアントを作成
    const aiClient = createAIClient();
    
    // プロンプトを構築
    const promptInput: TagGenerationInput = {
      title: title.trim(),
      description: description.trim(),
      existingTags,
      maxTags: max,
      locale
    };
    
    const prompt = buildTagGenerationPrompt(promptInput);
    
    try {
      // AI でタグ生成
      const rawResponse = await aiClient.generateText(prompt);
      const parsedResponse = parseTagResponse(rawResponse);
      
      // レスポンスをサニタイズ
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
      
      return {
        picked,
        fresh,
        all: [...picked, ...fresh]
      };
      
    } catch (error) {
      console.error("Tag generation failed:", error);
      throw new Error("タグ生成に失敗しました");
    }
  }
}