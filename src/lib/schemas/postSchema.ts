import { z } from "zod";

export const postSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(19, "タイトルは19文字以内で入力してください"),
  url: z.string().trim()
    .url("有効なURLを入力してください")
    .regex(/^https:\/\/(gemini\.google\.com\/share\/[a-zA-Z0-9_-]+|g\.co\/gemini\/share\/[a-zA-Z0-9_-]+)$/, "Geminiの共有リンク（https://gemini.google.com/share/xxxxx または https://g.co/gemini/share/xxxxx）を入力してください"),
  description: z.string().min(1, "説明は必須です").max(500, "説明は500文字以内で入力してください"),
  tags: z.array(z.string().min(1).max(20)).max(5, "タグは5個まで追加できます").optional().default([]),
  category: z.string().min(1, "カテゴリは必須です"),
  thumbnailUrl: z.string().url().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  isPublic: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(1, "カテゴリ名は必須です").max(50, "カテゴリ名は50文字以内で入力してください"),
  description: z.string().max(200, "説明は200文字以内で入力してください"),
  icon: z.string().min(1, "アイコンは必須です"),
});

export type PostFormData = z.infer<typeof postSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;