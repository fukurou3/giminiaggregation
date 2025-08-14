/**
 * 投稿フォームの基本バリデーション
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validatePostFormBasic(formData: {
  title?: string;
  description?: string;
  url?: string;
}): ValidationResult {
  if (!formData.title?.trim()) {
    return { isValid: false, error: 'タイトルを入力してください' };
  }

  if (!formData.description?.trim()) {
    return { isValid: false, error: '作品概要を入力してください' };
  }

  if (!formData.url?.trim()) {
    return { isValid: false, error: '作品URLを入力してください' };
  }

  // URL形式チェック
  try {
    new URL(formData.url);
  } catch {
    return { isValid: false, error: '有効なURLを入力してください' };
  }

  return { isValid: true };
}