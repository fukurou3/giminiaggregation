/**
 * タグ生成リクエストの入力型
 */
export interface TagGenerationInput {
  title: string;
  description?: string;
  existingTags: string[];
  maxTags: number;
  locale: "ja" | "en";
}

/**
 * タグ生成のプロンプトを構築
 */
export function buildTagGenerationPrompt(input: TagGenerationInput): string {
  const { title, description, existingTags, maxTags, locale } = input;
  
  const uniqExisting = Array.from(new Set(existingTags.map((t) => t.trim())))
    .filter(Boolean)
    .slice(0, 400);

  const systemPrompt = `
あなたは投稿タイトルからタグを作るアシスタントです。
1) existingTags から関連性の高いものを最大 ${maxTags} 個選びます（厳守）。
2) 足りない概念のみ "new" に最小限の新規タグを提案します。
出力は次のJSONのみ:
{"picked": string[], "new": string[]}
制約:
- "picked": existingTags に含まれる文字列のみ
- "new": existingTags に無い短い名詞句（#や絵文字なし、1〜5語）
- 同義語の重複禁止。一般語より具体語を優先。
- 言語: ${locale}
`.trim();

  const existingList = uniqExisting.length 
    ? `existingTags:\n- ${uniqExisting.join("\n- ")}` 
    : "existingTags: (none)";
  
  const userInput = `title: ${title}\ndescription: ${description ?? "(none)"}\n${existingList}`;

  return `${systemPrompt}\n\n${userInput}`;
}