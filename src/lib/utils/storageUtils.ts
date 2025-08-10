import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, UploadTaskSnapshot } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import type { UploadConfig, ProcessedImageResult, UploadProgress } from '@/types/Upload';
import { ImageUploadError } from './uploadErrors';

export interface UploadImageOptions {
  userId: string;
  folder?: string;
}

export const uploadImageToStorage = async (
  file: File,
  options: UploadImageOptions,
  maxRetries: number = 2
): Promise<ProcessedImageResult> => {
  const { userId, folder = 'post-images' } = options;
  
  // ファイル名を生成（重複を避けるためにUUIDを使用）
  const fileExtension = file.name.split('.').pop() || 'jpg';
  const fileName = `${uuidv4()}.${fileExtension}`;
  const filePath = `${folder}/${userId}/${fileName}`;

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Firebase Storageへファイルをアップロード（キャッシュ最適化メタデータ付き）
      const storageRef = ref(storage, filePath);
      const metadata = {
        cacheControl: 'public, max-age=31536000, immutable',
        contentType: file.type,
        customMetadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
          fileSize: file.size.toString()
        }
      };
      
      const snapshot = await uploadBytes(storageRef, file, metadata);
      
      // ダウンロードURLを取得
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // 画像の寸法を取得（非同期で実行、失敗しても処理は継続）
      let dimensions = { width: 0, height: 0 };
      try {
        dimensions = await getImageDimensions(file);
      } catch (error) {
        console.warn('Failed to get image dimensions:', error);
      }

      return {
        url: downloadURL,
        metadata: {
          originalName: file.name,
          fileSize: file.size,
          dimensions,
          uploadedAt: new Date().toISOString(),
          uploadedBy: userId
        }
      };
    } catch (error) {
      lastError = error;
      console.error(`Image upload failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
      
      // 最後の試行でない場合は指数バックオフで待機
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw ImageUploadError.fromFirebaseError(lastError);
};

// 画像の寸法を取得するヘルパー関数
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for dimension calculation'));
    };
    
    img.src = objectUrl;
  });
};

export const uploadMultipleImages = async (
  files: File[],
  options: UploadImageOptions,
  onProgress?: (progress: UploadProgress) => void
): Promise<string[]> => {
  const results: string[] = [];
  let completed = 0;

  // 並列アップロード（最大3ファイル同時実行でパフォーマンス最適化）
  const concurrency = Math.min(3, files.length);
  const chunks = [];
  
  for (let i = 0; i < files.length; i += concurrency) {
    chunks.push(files.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const chunkPromises = chunk.map(async (file, chunkIndex) => {
      try {
        const result = await uploadImageToStorage(file, options);
        completed++;
        
        // 詳細な進捗情報を提供
        if (onProgress) {
          onProgress({
            completed,
            total: files.length,
            percentage: Math.round((completed / files.length) * 100),
            currentFile: file.name
          });
        }
        
        return result.url;
      } catch (error) {
        console.error(`Failed to upload image ${file.name}:`, error);
        throw new ImageUploadError(
          'UPLOAD_FAILED',
          `${file.name} のアップロードに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
          { fileName: file.name, originalError: error }
        );
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  return results;
};

// 後方互換性のための旧API（非推奨）
/** @deprecated Use uploadMultipleImages with UploadProgress callback instead */
export const uploadMultipleImagesLegacy = async (
  files: File[],
  options: UploadImageOptions,
  onProgress?: (progress: number) => void
): Promise<string[]> => {
  return uploadMultipleImages(files, options, (progress) => {
    if (onProgress) {
      onProgress(progress.percentage);
    }
  });
};