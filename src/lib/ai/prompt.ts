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
あなたに与えたタイトルと説明文は、ユーザーの作品概要です。
まずタイトルと説明文から重要なキーワードを抽出してください。
既存タグの中から、抽出したキーワードに最も関連性が高いタグを選びます。
既存タグに該当がなければ、新しいタグを短く作成してください。
タグは、ユーザーの作品が検索に引っかかりやすく、かつ乱立を防ぐために簡潔で汎用的なものにしてください。

出力は次のJSONのみ:
{"picked": string[], "new": string[]}
制約:
- "picked" は existingTags に含まれる文字列のみ
- "new" は existingTags に無い短い名詞句（#や絵文字なし、1〜5語）
- 同義語の重複は禁止。一般語より具体語を優先
- 言語は入力に合わせて自然な日本語で
- 公序良俗に反する単語やNSFW（性的・暴力的・差別的）なタグは生成しない
`.trim();

  const existingList = uniqExisting.length 
    ? `existingTags:\n- ${uniqExisting.join("\n- ")}` 
    : "existingTags: (none)";
  
  const userInput = `title: ${title}\ndescription: ${description ?? "(none)"}\n${existingList}`;

  return `${systemPrompt}\n\n${userInput}`;
}