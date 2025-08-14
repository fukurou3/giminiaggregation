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
 * コーチングリクエストの入力型
 */
export interface CoachInput {
  title: string;
  categoryId: string;
  tagIds: string[];
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

/**
 * コーチングアドバイスのプロンプトを構築
 */
export function buildCoachPrompt(input: CoachInput): string {
  const { title, categoryId, tagIds, overview, optional, appUrl, locale } = input;
  
  const systemPrompt = `
あなたは投稿前の"お節介編集者"です。

【役割】
AIを活用した作品とアイデアの共有サイトに自分の作品とともに第三者にアピールする投稿の改善アドバイスを行います。

【価値観】
「AIをどう使えば面白い／役立つになるのか？」というアイデアが価値です。
作品・アイデア・投稿者の個性のアピールをすると注目を得ます。
「実用化の入口」＋「作者の頭の中」として見せる説明文が推奨です。

【タスク】
1. タイトル・概要・任意項目から重要キーワードを抽出し、伝わる概要文に磨く
2. 作品利用者が得られる便益ポイントを明確化
3. 足りない情報を最大5問の質問で引き出す（重複・誘導質問NG）

【書き方ルール】
- 事実の捏造禁止。不明は「不明」と書く
- 便益主語（誰が何にどう役立つか）を優先、バズワード過多禁止
- NSFW/暴力/差別/違法行為の助長にあたる語は使わない
- 日本語、簡潔・具体
- headlineIdeasのタイトル案は必ず14文字以内で作成（空白・記号含む）
- refinedOverviewは最初の50文字程度で作品の魅力を端的に伝え、その後改行して詳細説明

【出力フォーマット】
JSONのみで返してください：
{
  "advice": {
    "refinedOverview": "50文字程度で魅力を端的に伝える文章。\n\n詳細な概要説明（重要キーワードを活用し、実用化の入口＋作者の頭の中として見せる説明文）",
    "headlineIdeas": ["14文字以内の案1", "14文字以内の案2", "14文字以内の案3"],
    "goodPoints": ["利用者が得られる便益1", "利用者が得られる便益2", "利用者が得られる便益3"]
  },
  "questionnaire": [
    {
      "field": "problem|background|scenes|users|differentiation|extensions",
      "question": "質問文"
    }
  ]
}
`.trim();

  // 任意項目を整理
  const optionalFields = [];
  if (optional.problem) optionalFields.push(`課題: ${optional.problem}`);
  if (optional.background) optionalFields.push(`背景: ${optional.background}`);
  if (optional.scenes) optionalFields.push(`想定シーン: ${optional.scenes}`);
  if (optional.users) optionalFields.push(`想定利用者: ${optional.users}`);
  if (optional.differentiation) optionalFields.push(`差別化ポイント: ${optional.differentiation}`);
  if (optional.extensions) optionalFields.push(`応用・発展アイデア: ${optional.extensions}`);
  
  const optionalText = optionalFields.length > 0 
    ? `\n任意項目:\n${optionalFields.join('\n')}` 
    : "\n任意項目: (未入力)";
  
  const userInput = `タイトル: ${title}
カテゴリ: ${categoryId}
タグ: ${tagIds.join(', ') || '(未入力)'}
作品概要: ${overview}${optionalText}
作品URL: ${appUrl || '(未入力)'}`;

  return `${systemPrompt}\n\n${userInput}`;
}
