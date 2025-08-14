import { z } from "zod";

export const postSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(19, "タイトルは19文字以内で入力してください"),
  url: z.string().trim()
    .url("有効なURLを入力してください")
    .regex(/^https:\/\/(gemini\.google\.com\/share\/[a-zA-Z0-9_-]+|g\.co\/gemini\/share\/[a-zA-Z0-9_-]+)$/, "Geminiの共有リンク（https://gemini.google.com/share/xxxxx または https://g.co/gemini/share/xxxxx）を入力してください"),
  description: z.string().min(1, "説明は必須です").max(500, "説明は500文字以内で入力してください"),
  tagIds: z.array(z.string().min(1).max(20)).min(1, "少なくとも1つのタグを追加してください").max(5, "タグは5個まで追加できます"),
  categoryId: z.string().min(1, "カテゴリは必須です"),
  // 最新画像スキーマ
  thumbnail: z.string().url().min(1, "サムネイル画像は必須です"),
  prImages: z.array(z.string().url()).max(6, "PR画像は6枚まで追加できます").optional(),
  isPublic: z.boolean().default(true),
  // コンセプト詳細フィールド（任意項目）
  problemBackground: z.string().max(1000, "課題・背景は1000文字以内で入力してください").optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  useCase: z.string().max(1000, "想定シーン・利用者は1000文字以内で入力してください").optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  uniquePoints: z.string().max(1000, "差別化ポイントは1000文字以内で入力してください").optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  futureIdeas: z.string().max(1000, "応用・発展アイデアは1000文字以内で入力してください").optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  // カスタムセクション
  customSections: z.array(z.object({
    id: z.string().min(1, "セクションIDは必須です"),
    title: z.string().min(1, "セクションタイトルは必須です").max(50, "セクションタイトルは50文字以内で入力してください"),
    content: z.string().max(1000, "セクション内容は1000文字以内で入力してください")
  })).max(10, "カスタムセクションは10個まで追加できます").optional(),
  // その他のフィールド
  acceptInterview: z.boolean().optional().default(false),
});;

export const categorySchema = z.object({
  name: z.string().min(1, "カテゴリ名は必須です").max(50, "カテゴリ名は50文字以内で入力してください"),
  description: z.string().max(200, "説明は200文字以内で入力してください"),
  icon: z.string().min(1, "アイコンは必須です"),
});

export type PostFormData = z.infer<typeof postSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;