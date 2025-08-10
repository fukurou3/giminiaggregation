// 画像アップロード関連のヘルパー関数

import { UPLOAD_CONSTANTS, type AllowedMimeType, type AllowedExtension } from '@/lib/constants/upload';
import type { ImageValidationResult } from '@/types/Upload';

/**
 * ファイルサイズを人間が読みやすい形式にフォーマット
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * MIME タイプが許可されているかチェック
 */
export const isAllowedMimeType = (mimeType: string): mimeType is AllowedMimeType => {
  return UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType);
};

/**
 * 拡張子が許可されているかチェック
 */
export const isAllowedExtension = (extension: string): extension is AllowedExtension => {
  return UPLOAD_CONSTANTS.ALLOWED_EXTENSIONS.includes(extension.toLowerCase() as AllowedExtension);
};

/**
 * ファイル名から拡張子を安全に取得
 */
export const getFileExtension = (fileName: string): string | null => {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null;
};

/**
 * 安全なファイル名を生成（特殊文字を除去）
 */
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // 特殊文字をアンダースコアに置換
    .replace(/_{2,}/g, '_') // 連続するアンダースコアを1つに
    .replace(/^_+|_+$/g, '') // 先頭・末尾のアンダースコアを除去
    .substring(0, 100); // 長すぎるファイル名を制限
};

/**
 * 指数バックオフでリトライ遅延を計算
 */
export const calculateRetryDelay = (attempt: number): number => {
  const delay = UPLOAD_CONSTANTS.RETRY_DELAY_BASE * Math.pow(2, attempt);
  return Math.min(delay, UPLOAD_CONSTANTS.MAX_RETRY_DELAY);
};

/**
 * ファイル配列の総サイズを計算
 */
export const calculateTotalSize = (files: readonly File[]): number => {
  return files.reduce((total, file) => total + file.size, 0);
};

/**
 * アップロード可能なファイル数の残り枠を計算
 */
export const getRemainingFileSlots = (currentCount: number): number => {
  return Math.max(0, UPLOAD_CONSTANTS.MAX_FILES - currentCount);
};

/**
 * ファイルがサイズ制限内かチェック
 */
export const isWithinSizeLimit = (file: File): boolean => {
  const maxSize = UPLOAD_CONSTANTS.MAX_FILE_SIZE_MB * 1024 * 1024;
  return file.size <= maxSize;
};

/**
 * 複数ファイルが総容量制限内かチェック
 */
export const isWithinTotalSizeLimit = (files: readonly File[]): boolean => {
  const totalSize = calculateTotalSize(files);
  const maxSize = UPLOAD_CONSTANTS.MAX_TOTAL_SIZE_MB * 1024 * 1024;
  return totalSize <= maxSize;
};

/**
 * ファイルサイズが推奨サイズ以下かチェック
 */
export const isRecommendedSize = (file: File): boolean => {
  const recommendedSize = UPLOAD_CONSTANTS.RECOMMENDED_FILE_SIZE_MB * 1024 * 1024;
  return file.size <= recommendedSize;
};

/**
 * 単一ファイルの詳細バリデーション
 */
export const validateSingleFile = (file: File): ImageValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ファイル名チェック
  if (!file.name?.trim()) {
    errors.push('ファイル名が不正です');
  }

  // MIME タイプチェック
  if (!isAllowedMimeType(file.type)) {
    errors.push(UPLOAD_CONSTANTS.ERROR_MESSAGES.INVALID_FORMAT(file.type));
  }

  // 拡張子チェック
  const extension = getFileExtension(file.name);
  if (!extension || !isAllowedExtension(extension)) {
    errors.push(UPLOAD_CONSTANTS.ERROR_MESSAGES.INVALID_EXTENSION(extension || 'なし'));
  }

  // ファイルサイズチェック
  if (!isWithinSizeLimit(file)) {
    const fileSize = formatFileSize(file.size);
    const maxSize = formatFileSize(UPLOAD_CONSTANTS.MAX_FILE_SIZE_MB * 1024 * 1024);
    errors.push(UPLOAD_CONSTANTS.ERROR_MESSAGES.FILE_TOO_LARGE(fileSize, maxSize));
  }

  // サイズ警告
  if (!isRecommendedSize(file) && isWithinSizeLimit(file)) {
    const fileSize = formatFileSize(file.size);
    const recommendedSize = formatFileSize(UPLOAD_CONSTANTS.RECOMMENDED_FILE_SIZE_MB * 1024 * 1024);
    warnings.push(UPLOAD_CONSTANTS.WARNING_MESSAGES.FILE_SIZE_WARNING(fileSize, recommendedSize));
  }

  return {
    isValid: errors.length === 0,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
  };
};

/**
 * 複数ファイルの詳細バリデーション
 */
export const validateMultipleFiles = (
  files: readonly File[],
  currentFileCount: number = 0
): ImageValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ファイル数チェック
  const totalFiles = files.length + currentFileCount;
  if (totalFiles > UPLOAD_CONSTANTS.MAX_FILES) {
    errors.push(UPLOAD_CONSTANTS.ERROR_MESSAGES.TOO_MANY_FILES(totalFiles, UPLOAD_CONSTANTS.MAX_FILES));
  }

  // 総容量チェック
  if (!isWithinTotalSizeLimit(files)) {
    const totalSize = formatFileSize(calculateTotalSize(files));
    const maxSize = formatFileSize(UPLOAD_CONSTANTS.MAX_TOTAL_SIZE_MB * 1024 * 1024);
    errors.push(UPLOAD_CONSTANTS.ERROR_MESSAGES.TOTAL_SIZE_EXCEEDED(totalSize, maxSize));
  }

  // 個別ファイルバリデーション
  files.forEach((file, index) => {
    const fileValidation = validateSingleFile(file);
    
    if (!fileValidation.isValid) {
      const fileErrors = fileValidation.errors.map(
        error => `ファイル${index + 1} (${file.name}): ${error}`
      );
      errors.push(...fileErrors);
    }

    const fileWarnings = fileValidation.warnings.map(
      warning => `ファイル${index + 1} (${file.name}): ${warning}`
    );
    warnings.push(...fileWarnings);
  });

  return {
    isValid: errors.length === 0,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
  };
};

/**
 * デバッグ用のファイル情報ログ出力
 */
export const logFileInfo = (file: File, prefix = 'File info'): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${prefix}:`, {
      name: file.name,
      type: file.type,
      size: formatFileSize(file.size),
      lastModified: new Date(file.lastModified).toISOString(),
    });
  }
};