// 画像アップロード関連の定数

export const UPLOAD_CONSTANTS = {
  // ファイル制限
  MAX_FILES: 5,
  MAX_FILE_SIZE_MB: 10,
  MAX_TOTAL_SIZE_MB: 4,
  RECOMMENDED_FILE_SIZE_MB: 2,

  // サポートされているファイル形式
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const,
  ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp'] as const,

  // 画像処理設定
  PROCESSING: {
    MAX_SIZE_MB: 0.5,
    MAX_WIDTH_OR_HEIGHT: 1200,
    ASPECT_RATIO: 5/3,
    JPEG_QUALITY: 0.9,
    REMOVE_EXIF: true,
  },

  // アップロード設定
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY_BASE: 1000, // ms
  MAX_RETRY_DELAY: 5000, // ms
  UPLOAD_CONCURRENCY: 3,

  // キャッシュ設定
  CACHE_CONTROL: 'public, max-age=31536000, immutable',

  // フォルダ設定
  FOLDERS: {
    POST_IMAGES: 'post-images',
    PROFILE_IMAGES: 'profile-images',
  } as const,

  // プレビュー設定
  PREVIEW: {
    MAX_WIDTH: 300,
    QUALITY: 0.9,
  },

  // エラーメッセージ
  ERROR_MESSAGES: {
    FILE_TOO_LARGE: (size: string, max: string) => `ファイルサイズが大きすぎます: ${size} (最大: ${max})`,
    INVALID_FORMAT: (type: string) => `サポートされていないファイル形式です: ${type}`,
    INVALID_EXTENSION: (ext: string) => `サポートされていない拡張子です: ${ext}`,
    TOO_MANY_FILES: (count: number, max: number) => `ファイル数が上限を超えています: ${count} (最大: ${max})`,
    TOTAL_SIZE_EXCEEDED: (size: string, max: string) => `総容量が上限を超えています: ${size} (最大: ${max})`,
    UPLOAD_FAILED: (filename: string) => `${filename} のアップロードに失敗しました`,
    PROCESSING_FAILED: (filename: string) => `${filename} の処理に失敗しました`,
    NETWORK_ERROR: 'ネットワークエラーが発生しました',
    AUTH_ERROR: 'アップロード権限がありません。ログインを確認してください',
    QUOTA_EXCEEDED: 'ストレージの容量制限に達しています',
  },

  // 警告メッセージ
  WARNING_MESSAGES: {
    FILE_SIZE_WARNING: (size: string, recommended: string) => 
      `ファイルサイズが大きいです: ${size} (推奨: ${recommended}以下)`,
    DUPLICATE_FILE: '同じ画像が既にアップロード済みです',
  },
} as const;

// 型定義
export type AllowedMimeType = typeof UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES[number];
export type AllowedExtension = typeof UPLOAD_CONSTANTS.ALLOWED_EXTENSIONS[number];
export type UploadFolder = typeof UPLOAD_CONSTANTS.FOLDERS[keyof typeof UPLOAD_CONSTANTS.FOLDERS];