// セキュリティ関連のユーティリティ

import { UPLOAD_CONSTANTS } from '@/lib/constants/upload';

/**
 * ファイルの実際のMIMEタイプを検証（ファイルシグネチャーをチェック）
 */
export const validateFileSignature = async (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const bytes = new Uint8Array(event.target?.result as ArrayBuffer);
        const signature = Array.from(bytes.slice(0, 4))
          .map(byte => byte.toString(16).padStart(2, '0'))
          .join('');
        
        // 既知の画像ファイルシグネチャー
        const validSignatures = [
          'ffd8ff', // JPEG
          '89504e', // PNG  
          '474946', // GIF
          '52494646', // RIFF (WebP container)
        ];
        
        const isValid = validSignatures.some(sig => signature.startsWith(sig));
        resolve(isValid);
      } catch (error) {
        console.warn('File signature validation failed:', error);
        resolve(false);
      }
    };
    
    reader.onerror = () => resolve(false);
    
    // ファイルの最初の4バイトを読み取り
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
};

/**
 * 画像の寸法をチェックして異常に大きいものを検出
 */
export const validateImageDimensions = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      // 異常に大きな画像を拒否（メモリ使用量対策）
      const maxDimension = 10000; // 10K pixels
      const maxPixels = 100000000; // 100M pixels
      const totalPixels = img.naturalWidth * img.naturalHeight;
      
      const isValidSize = 
        img.naturalWidth <= maxDimension &&
        img.naturalHeight <= maxDimension &&
        totalPixels <= maxPixels;
      
      resolve(isValidSize);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(false);
    };
    
    img.src = objectUrl;
  });
};

/**
 * ファイル名のサニタイゼーション（パストラバーサル攻撃対策）
 */
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    // 危険な文字を除去
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    // パストラバーサルパターンを除去
    .replace(/\.{2,}/g, '.')
    // 先頭・末尾のピリオドとスペースを除去
    .replace(/^[\s.]+|[\s.]+$/g, '')
    // 長すぎるファイル名を制限
    .substring(0, 100)
    // 空の場合はデフォルト名を設定
    || 'untitled';
};

/**
 * セキュアなファイル名を生成
 */
export const generateSecureFileName = (originalName: string, userId: string): string => {
  const sanitized = sanitizeFileName(originalName);
  const extension = sanitized.split('.').pop()?.toLowerCase() || 'jpg';
  const baseName = sanitized.replace(/\.[^/.]+$/, '');
  
  // タイムスタンプとユーザーIDを組み合わせた一意の名前
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const userHash = userId.substring(0, 8); // ユーザーIDの一部
  
  return `${baseName}_${timestamp}_${userHash}_${randomSuffix}.${extension}`;
};

/**
 * アップロード前の総合セキュリティチェック
 */
export const performSecurityCheck = async (file: File): Promise<{
  isSecure: boolean;
  issues: string[];
}> => {
  const issues: string[] = [];

  // 1. ファイル名チェック
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    issues.push('不正なファイル名パスが検出されました');
  }

  // 2. MIME タイプチェック
  if (!UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES.includes(file.type as any)) {
    issues.push('許可されていないファイル形式です');
  }

  // 3. ファイルシグネチャーチェック
  try {
    const hasValidSignature = await validateFileSignature(file);
    if (!hasValidSignature) {
      issues.push('ファイル形式の検証に失敗しました');
    }
  } catch (error) {
    issues.push('ファイルの整合性チェックに失敗しました');
  }

  // 4. 画像寸法チェック
  try {
    const hasValidDimensions = await validateImageDimensions(file);
    if (!hasValidDimensions) {
      issues.push('画像のサイズが制限を超えています');
    }
  } catch (error) {
    issues.push('画像寸法の検証に失敗しました');
  }

  return {
    isSecure: issues.length === 0,
    issues: Object.freeze(issues)
  };
};

/**
 * レート制限チェック（クライアントサイド）
 */
export class UploadRateLimit {
  private static uploads: number[] = [];
  private static readonly WINDOW_SIZE = 60 * 1000; // 1分
  private static readonly MAX_UPLOADS_PER_WINDOW = 10;

  static canUpload(): boolean {
    const now = Date.now();
    
    // 古いエントリを削除
    UploadRateLimit.uploads = UploadRateLimit.uploads.filter(
      timestamp => now - timestamp < UploadRateLimit.WINDOW_SIZE
    );
    
    return UploadRateLimit.uploads.length < UploadRateLimit.MAX_UPLOADS_PER_WINDOW;
  }

  static recordUpload(): void {
    if (UploadRateLimit.canUpload()) {
      UploadRateLimit.uploads.push(Date.now());
    }
  }

  static getTimeUntilNextUpload(): number {
    if (UploadRateLimit.canUpload()) {
      return 0;
    }
    
    const oldestUpload = Math.min(...UploadRateLimit.uploads);
    const timeUntilExpire = UploadRateLimit.WINDOW_SIZE - (Date.now() - oldestUpload);
    
    return Math.max(0, timeUntilExpire);
  }
}

/**
 * CSP違反の検出と報告
 */
export const reportCSPViolation = (violation: string): void => {
  if (process.env.NODE_ENV === 'production') {
    // 本番環境では監視サービスに送信
    console.error('CSP Violation detected:', violation);
  } else {
    console.warn('CSP Violation (dev):', violation);
  }
};