// 画像アップロード関連の型定義

export interface ImageProcessOptions {
  readonly maxSizeMB: number;
  readonly maxWidthOrHeight: number;
  readonly aspectRatio: number;
  readonly removeExif: boolean;
}

export interface UploadConfig {
  readonly userId: string;
  readonly folder: 'post-images' | 'profile-images';
  readonly maxFiles: number;
  readonly maxTotalSizeMB: number;
}

export interface ImageMetadata {
  readonly originalName: string;
  readonly fileSize: number;
  readonly dimensions: {
    readonly width: number;
    readonly height: number;
  };
  readonly uploadedAt: string;
  readonly uploadedBy: string;
}

export interface ProcessedImageResult {
  readonly url: string;
  readonly metadata: ImageMetadata;
}

export interface UploadProgress {
  readonly completed: number;
  readonly total: number;
  readonly percentage: number;
  readonly currentFile?: string;
}

export interface UploadError extends Error {
  readonly code: 'VALIDATION_FAILED' | 'UPLOAD_FAILED' | 'PROCESSING_FAILED' | 'NETWORK_ERROR';
  readonly details?: Record<string, unknown>;
}

export interface ImageValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export interface ImageItem {
  readonly id: string;
  readonly url: string;
  readonly file?: File;
  readonly fileHash?: string;
  readonly status: 'uploading' | 'completed' | 'error';
  readonly error?: string;
  readonly previewUrl?: string;
  readonly originalDimensions?: {
    readonly width: number;
    readonly height: number;
  };
  readonly progress?: number;
}