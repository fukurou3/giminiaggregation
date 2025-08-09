import imageCompression from 'browser-image-compression';
import { removeExifData } from './exifRemover';

export interface ImageProcessingOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  aspectRatio?: number; // width/height ratio
  removeExif?: boolean; // Remove EXIF metadata for security
}

export const processImage = async (
  file: File,
  options: ImageProcessingOptions = {}
): Promise<File> => {
  const {
    maxSizeMB = 0.5,
    maxWidthOrHeight = 1200,
    useWebWorker = true,
    aspectRatio,
    removeExif = true
  } = options;

  let processedFile = file;

  // 1. EXIF データの除去（セキュリティ強化）
  if (removeExif) {
    try {
      processedFile = await removeExifData(processedFile, { quality: 0.95 });
    } catch (error) {
      console.warn(`EXIF removal failed for ${file.name}:`, error);
      // EXIFの除去に失敗した場合も処理を続行
    }
  }

  // 2. 5:3のアスペクト比に切り抜く場合
  if (aspectRatio) {
    processedFile = await cropToAspectRatio(processedFile, aspectRatio);
  }

  // 3. 画像圧縮
  const compressedFile = await imageCompression(processedFile, {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker,
  });

  return compressedFile;
};;

export const cropToAspectRatio = async (
  file: File,
  aspectRatio: number // 5:3の場合は5/3 = 1.666...
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let blobUrl: string | null = null;

    // Canvas cleanup function
    const cleanup = () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
      // Clear canvas context and remove references
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.width = 0;
      canvas.height = 0;
      img.src = '';
      img.removeAttribute('src');
    };

    if (!ctx) {
      cleanup();
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      try {
        const { width: imgWidth, height: imgHeight } = img;
        const currentRatio = imgWidth / imgHeight;

        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = imgWidth;
        let sourceHeight = imgHeight;

        if (currentRatio > aspectRatio) {
          // 画像が目標比率より横長 → 左右を切り取る
          sourceWidth = imgHeight * aspectRatio;
          sourceX = (imgWidth - sourceWidth) / 2;
        } else if (currentRatio < aspectRatio) {
          // 画像が目標比率より縦長 → 上下を切り取る
          sourceHeight = imgWidth / aspectRatio;
          sourceY = (imgHeight - sourceHeight) / 2;
        }

        // Canvas のサイズを設定
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;

        // 切り抜いた画像をCanvasに描画
        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, sourceWidth, sourceHeight
        );

        // CanvasをBlobに変換
        canvas.toBlob((blob) => {
          if (!blob) {
            cleanup();
            reject(new Error('Canvas to blob conversion failed'));
            return;
          }

          // BlobをFileに変換
          const croppedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });

          cleanup(); // 成功時もクリーンアップ
          resolve(croppedFile);
        }, file.type);
      } catch (error) {
        cleanup();
        reject(new Error(`Image processing failed: ${error}`));
      }
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image'));
    };

    // Blob URLを作成してトラッキング
    blobUrl = URL.createObjectURL(file);
    img.src = blobUrl;
  });
};

export const validateImageFile = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return allowedTypes.includes(file.type);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const generateFileHash = async (file: File): Promise<string> => {
  try {
    // ファイル内容を読み取り
    const arrayBuffer = await file.arrayBuffer();
    
    // SHA-256ハッシュを計算
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    
    // ハッシュを16進文字列に変換
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // ファイル名、サイズ、日付も組み合わせて確実に一意性を担保
    const metadata = `${file.name}-${file.size}-${file.lastModified}`;
    return `${hashHex.substring(0, 16)}-${btoa(metadata).replace(/[/+=]/g, '')}`;
  } catch (error) {
    console.warn('Failed to generate secure hash, falling back to basic hash:', error);
    // フォールバック: 基本的なハッシュ
    return `basic-${file.name.replace(/[^a-zA-Z0-9]/g, '')}-${file.size}-${file.lastModified}`;
  }
};

// 同期版（後方互換性のため）
export const generateFileHashSync = (file: File): string => {
  return `sync-${file.name.replace(/[^a-zA-Z0-9]/g, '')}-${file.size}-${file.lastModified}-${Date.now()}`;
};

export const checkDuplicateFiles = async (files: File[], existingHashes: Set<string>): Promise<{ uniqueFiles: File[], fileHashes: string[] }> => {
  const uniqueFiles: File[] = [];
  const fileHashes: string[] = [];
  const seenHashes = new Set<string>();
  
  for (const file of files) {
    const hash = await generateFileHash(file);
    
    // 既存のハッシュまたは既にこの処理で見たハッシュと重複していない場合のみ追加
    if (!existingHashes.has(hash) && !seenHashes.has(hash)) {
      uniqueFiles.push(file);
      fileHashes.push(hash);
      seenHashes.add(hash);
    }
  }
  
  return { uniqueFiles, fileHashes };
};

export const calculateTotalSize = (files: File[]): number => {
  return files.reduce((total, file) => total + file.size, 0);
};