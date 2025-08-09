/**
 * AIレスポンスの期待される型
 */
export interface AITagResponse {
  picked: string[];
  new: string[];
}

/**
 * AIの生テキストレスポンスからJSONを抽出・検証
 */
export function parseTagResponse(rawText: string): AITagResponse {
  let jsonStr = rawText.trim();
  
  // マークダウンコードブロックを除去
  if (jsonStr.startsWith('```json\n') && jsonStr.endsWith('\n```')) {
    jsonStr = jsonStr.slice(8, -4).trim();
  } else if (jsonStr.startsWith('```\n') && jsonStr.endsWith('\n```')) {
    jsonStr = jsonStr.slice(4, -4).trim();
  }
  
  // JSON部分を抽出（最後の{...}パターンを探す）
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  const extractedJson = jsonMatch?.[0] ?? jsonStr;

  let parsed: AITagResponse = { picked: [], new: [] };
  
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
 * 文字列配列をサニタイズ（空文字や非文字列を除去）
 */
export function sanitizeStringArray(arr: unknown[]): string[] {
  return arr
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);
}