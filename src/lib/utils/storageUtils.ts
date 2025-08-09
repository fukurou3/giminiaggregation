import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export interface UploadImageOptions {
  userId: string;
  folder?: string;
}

export const uploadImageToStorage = async (
  file: File,
  options: UploadImageOptions,
  maxRetries: number = 2
): Promise<string> => {
  const { userId, folder = 'images' } = options;
  
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
      };
      
      const snapshot = await uploadBytes(storageRef, file, metadata);
      
      // ダウンロードURLを取得
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      lastError = error as Error;
      console.error(`Image upload failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
      
      // 最後の試行でない場合は少し待機してからリトライ
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw new Error(`画像のアップロードに失敗しました: ${lastError?.message || '不明なエラー'}`);
};

export const uploadMultipleImages = async (
  files: File[],
  options: UploadImageOptions,
  onProgress?: (progress: number) => void
): Promise<string[]> => {
  const uploadPromises = files.map(async (file, index) => {
    try {
      const url = await uploadImageToStorage(file, options);
      
      // 進捗を更新
      if (onProgress) {
        const progress = ((index + 1) / files.length) * 100;
        onProgress(progress);
      }
      
      return url;
    } catch (error) {
      console.error(`Failed to upload image ${index}:`, error);
      throw error;
    }
  });

  return Promise.all(uploadPromises);
};