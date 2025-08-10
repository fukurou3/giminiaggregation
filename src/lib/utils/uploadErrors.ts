import type { UploadError } from '@/types/Upload';

export class ImageUploadError extends Error implements UploadError {
  readonly code: UploadError['code'];
  readonly details?: Record<string, unknown>;

  constructor(
    code: UploadError['code'],
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ImageUploadError';
    this.code = code;
    this.details = details;
    
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ImageUploadError);
    }
  }

  static fromFirebaseError(error: unknown): ImageUploadError {
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string; message: string };
      
      switch (firebaseError.code) {
        case 'storage/unauthorized':
          return new ImageUploadError(
            'UPLOAD_FAILED',
            'アップロード権限がありません。ログインを確認してください。',
            { firebaseCode: firebaseError.code }
          );
        case 'storage/canceled':
          return new ImageUploadError(
            'UPLOAD_FAILED',
            'アップロードがキャンセルされました。',
            { firebaseCode: firebaseError.code }
          );
        case 'storage/quota-exceeded':
          return new ImageUploadError(
            'UPLOAD_FAILED',
            'ストレージの容量制限に達しています。',
            { firebaseCode: firebaseError.code }
          );
        case 'storage/invalid-format':
          return new ImageUploadError(
            'VALIDATION_FAILED',
            'サポートされていないファイル形式です。',
            { firebaseCode: firebaseError.code }
          );
        case 'storage/invalid-argument':
          return new ImageUploadError(
            'VALIDATION_FAILED',
            '無効なファイルです。',
            { firebaseCode: firebaseError.code }
          );
        default:
          return new ImageUploadError(
            'NETWORK_ERROR',
            `アップロード中にエラーが発生しました: ${firebaseError.message}`,
            { firebaseCode: firebaseError.code }
          );
      }
    }

    if (error instanceof Error) {
      return new ImageUploadError(
        'NETWORK_ERROR',
        error.message,
        { originalError: error.name }
      );
    }

    return new ImageUploadError(
      'NETWORK_ERROR',
      '予期しないエラーが発生しました。',
      { originalError: String(error) }
    );
  }
}

export const createValidationError = (message: string, details?: Record<string, unknown>): ImageUploadError => {
  return new ImageUploadError('VALIDATION_FAILED', message, details);
};

export const createProcessingError = (message: string, details?: Record<string, unknown>): ImageUploadError => {
  return new ImageUploadError('PROCESSING_FAILED', message, details);
};