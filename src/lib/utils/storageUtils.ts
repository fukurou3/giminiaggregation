import { storage, auth } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, UploadTaskSnapshot } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import type { UploadConfig, ProcessedImageResult, UploadProgress } from '@/types/Upload';
import { ImageUploadError } from './uploadErrors';

export interface UploadImageOptions {
  userId: string;
  folder?: string;
  mode?: 'post' | 'avatar';
}

export const uploadImageToStorage = async (
  file: File,
  options: UploadImageOptions,
  maxRetries: number = 2
): Promise<ProcessedImageResult> => {
  const { userId, folder = 'post-images', mode = 'post' } = options;
  
  // 認証状態を確認
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new ImageUploadError('認証が必要です。ログインしてください。', 'auth_required');
  }
  
  if (currentUser.uid !== userId) {
    throw new ImageUploadError('ユーザーIDが一致しません。', 'user_mismatch');
  }
  
  console.log('Upload auth check passed:', {
    currentUserId: currentUser.uid,
    requestedUserId: userId,
    isAuthenticated: !!currentUser,
    tokenExists: !!await currentUser.getIdToken()
  });
  
  // 二段階アップロード: まず/tmpディレクトリに非公開でアップロード
  const sessionId = uuidv4();
  const fileExtension = file.name.split('.').pop() || 'jpg';
  
  // モード依存のファイル名プレフィックス
  const filePrefix = mode === 'avatar' ? 'avatar_' : 'post_';
  const fileName = `${filePrefix}${uuidv4()}.${fileExtension}`;
  const tmpFilePath = `tmp/${sessionId}/${fileName}`;

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Step 1: Firebase Storageの/tmpディレクトリに非公開でアップロード
      const storageRef = ref(storage, tmpFilePath);
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
          fileSize: file.size.toString(),
          sessionId,
          mode, // モード情報を追加
          processingStatus: 'pending' // Cloud Functionsによる処理待ち
        }
      };
      
      const snapshot = await uploadBytes(storageRef, file, metadata);
      
      // Step 2: 一時的なダウンロードURLを取得（処理監視用）
      const tmpDownloadURL = await getDownloadURL(snapshot.ref);
      
      // Step 3: Cloud Functionsによる処理完了を待機
      const processedResult = await waitForProcessing(sessionId, fileName, userId);
      
      return processedResult;
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

/**
 * Cloud Functionsによる画像処理完了を待機
 */
const waitForProcessing = async (
  sessionId: string, 
  fileName: string, 
  userId: string,
  timeoutMs: number = 60000 // 60秒
): Promise<ProcessedImageResult> => {
  const startTime = Date.now();
  const pollInterval = 2000; // 2秒間隔でポーリング
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      // 認証トークンを取得
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('認証が必要です');
      }
      
      const token = await currentUser.getIdToken();
      
      // Firestoreから処理結果を確認
      const response = await fetch('/api/check-image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, fileName, userId })
      });
      
      if (!response.ok) {
        // 認証エラーの場合は即座に終了
        if (response.status === 401 || response.status === 403) {
          throw new ImageUploadError(
            'AUTH_ERROR',
            '認証に失敗しました。ログインを確認してください。',
            { sessionId, fileName, status: response.status }
          );
        }
        throw new Error(`Processing check failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'processed') {
        return {
          url: result.publicUrl,
          metadata: {
            originalName: fileName,
            fileSize: result.metadata.size,
            dimensions: {
              width: result.metadata.width,
              height: result.metadata.height
            },
            uploadedAt: result.processedAt,
            uploadedBy: userId
          }
        };
      } else if (result.status === 'failed') {
        throw new ImageUploadError(
          'PROCESSING_FAILED',
          `画像処理に失敗しました: ${result.error}`,
          { sessionId, fileName }
        );
      }
      
      // まだ処理中の場合は待機
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
    } catch (error) {
      console.error('Processing check error:', error);
      
      // 認証エラーまたは致命的エラーの場合は即座に終了
      if (error instanceof ImageUploadError && error.code === 'AUTH_ERROR') {
        throw error;
      }
      
      // タイムアウトチェック
      if (Date.now() - startTime > timeoutMs - pollInterval) {
        throw new ImageUploadError(
          'PROCESSING_TIMEOUT',
          '画像処理がタイムアウトしました。しばらく待ってから再試行してください。',
          { sessionId, fileName, originalError: error }
        );
      }
      
      // 一時的なエラーの場合は待機して再試行
      console.log(`Temporary error, retrying in ${pollInterval}ms...`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  throw new ImageUploadError(
    'PROCESSING_TIMEOUT',
    '画像処理がタイムアウトしました。',
    { sessionId, fileName }
  );
};

/**
 * アップロード前のレート制限チェック
 */
const checkRateLimits = async (userId: string, fileCount: number): Promise<void> => {
  try {
    const response = await fetch('/api/check-rate-limits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, fileCount })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ImageUploadError(
        'RATE_LIMITED',
        errorData.message || 'レート制限に達しています',
        { userId, fileCount }
      );
    }

    const result = await response.json();
    
    if (!result.allowed) {
      throw new ImageUploadError(
        'RATE_LIMITED',
        result.message || 'アップロード制限に達しています',
        { userId, fileCount, remaining: result.remaining }
      );
    }
  } catch (error) {
    if (error instanceof ImageUploadError) {
      throw error;
    }
    
    // ネットワークエラー等の場合は警告してアップロードは続行
    console.warn('Rate limit check failed, continuing upload:', error);
  }
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
  // レート制限チェック
  await checkRateLimits(options.userId, files.length);
  
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