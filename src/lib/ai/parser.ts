import { extractJSON } from './base';

/**
 * AIレスポンスの期待される型
 */
export interface AITagResponse {
  picked: string[];
  new: string[];
}

/**
 * AIコーチレスポンスの期待される型
 */
export interface AICoachResponse {
  advice: {
    refinedOverview: string;
    storeBlurb140: string;
    headlineIdeas: string[];
    valueBullets: string[];
  };
  questionnaire: Array<{
    field: "problem" | "background" | "scenes" | "users" | "differentiation" | "extensions";
    question: string;
    why: string;
  }>;
}

/**
 * AIの生テキストレスポンスからJSONを抽出・検証
 */
export function parseTagResponse(rawText: string): AITagResponse {
  const extractedJson = extractJSON(rawText);

  const parsed: AITagResponse = { picked: [], new: [] };
  
  try {
    const result = JSON.parse(extractedJson);
    
    // 基本的な型チェック
    if (result && typeof result === 'object') {
      parsed.picked = Array.isArray(result.picked) ? result.picked : [];
      parsed.new = Array.isArray(result.new) ? result.new : [];
    }
  } catch {
    console.warn("Failed to parse AI response as JSON:", extractedJson);
    console.warn("Original text:", rawText);
    // エラー時はデフォルト値を返す
  }

  return parsed;
}

/**
 * AIの生テキストレスポンスからコーチングJSONを抽出・検証
 */
export function parseCoachResponse(rawText: string): AICoachResponse {
  const extractedJson = extractJSON(rawText);

  // デフォルト値
  const parsed: AICoachResponse = {
    advice: {
      refinedOverview: "概要の改善案を生成できませんでした",
      storeBlurb140: "140文字の紹介文を生成できませんでした",
      headlineIdeas: ["ヘッドライン案1", "ヘッドライン案2", "ヘッドライン案3"],
      valueBullets: ["便益案1", "便益案2", "便益案3"],
    },
    questionnaire: [],
  };
  
  try {
    const result = JSON.parse(extractedJson);
    
    // 基本的な型チェックと安全な値の取得
    if (result && typeof result === 'object') {
      // advice セクション
      if (result.advice && typeof result.advice === 'object') {
        if (typeof result.advice.refinedOverview === 'string') {
          parsed.advice.refinedOverview = result.advice.refinedOverview;
        }
        if (typeof result.advice.storeBlurb140 === 'string') {
          parsed.advice.storeBlurb140 = result.advice.storeBlurb140;
        }
        if (Array.isArray(result.advice.headlineIdeas)) {
          const headlines = sanitizeStringArray(result.advice.headlineIdeas);
          if (headlines.length >= 3) {
            parsed.advice.headlineIdeas = headlines.slice(0, 3);
          }
        }
        if (Array.isArray(result.advice.valueBullets)) {
          const bullets = sanitizeStringArray(result.advice.valueBullets);
          if (bullets.length >= 3) {
            parsed.advice.valueBullets = bullets.slice(0, 3);
          }
        }
      }
      
      // questionnaire セクション
      if (Array.isArray(result.questionnaire)) {
        parsed.questionnaire = result.questionnaire
          .filter((item: unknown): item is Record<string, unknown> => item && typeof item === 'object')
          .filter((item: Record<string, unknown>) => 
            typeof item.field === 'string' &&
            typeof item.question === 'string' &&
            typeof item.why === 'string' &&
            ['problem', 'background', 'scenes', 'users', 'differentiation', 'extensions'].includes(item.field as string)
          )
          .slice(0, 5); // 最大5問
      }
      

    }
  } catch {
    console.warn("Failed to parse AI coach response as JSON:", extractedJson);
    console.warn("Original text:", rawText);
    // エラー時はデフォルト値を使用
  }

  return parsed;
}

/**
 * 文字列配列をサニタイズ（空文字や非文字列を除去）
 */
export function sanitizeStringArray(arr: unknown[]): string[] {
  return arr
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);
}