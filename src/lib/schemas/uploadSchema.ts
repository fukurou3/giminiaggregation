import { z } from "zod";

export const profileImageUploadSchema = z.object({
  file: z
    .instanceof(File, { message: "ファイルが見つかりません" })
    .refine((file) => file.type.startsWith("image/"), {
      message: "画像ファイルのみアップロード可能です",
    })
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: "ファイルサイズは5MB以下にしてください",
    }),
});

export const refreshProfileImageUrlSchema = z.object({
  fileName: z.string().min(1, "ファイル名が必要です"),
});

export type ProfileImageUploadForm = z.infer<typeof profileImageUploadSchema>;
export type RefreshProfileImageUrlInput = z.infer<typeof refreshProfileImageUrlSchema>;

