import imageCompression from 'browser-image-compression';

export interface ImageProcessingOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  aspectRatio?: number; // width/height ratio
}

export const processImage = async (
  file: File,
  options: ImageProcessingOptions = {}
): Promise<File> => {
  const {
    maxSizeMB = 0.5,
    maxWidthOrHeight = 1200,
    useWebWorker = true,
    aspectRatio
  } = options;

  let processedFile = file;

  // 5:3のアスペクト比に切り抜く場合
  if (aspectRatio) {
    processedFile = await cropToAspectRatio(file, aspectRatio);
  }

  // 画像圧縮
  const compressedFile = await imageCompression(processedFile, {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker,
  });

  return compressedFile;
};

export const cropToAspectRatio = async (
  file: File,
  aspectRatio: number // 5:3の場合は5/3 = 1.666...
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
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
          reject(new Error('Canvas to blob conversion failed'));
          return;
        }

        // BlobをFileに変換
        const croppedFile = new File([blob], file.name, {
          type: file.type,
          lastModified: Date.now(),
        });

        resolve(croppedFile);
      }, file.type);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
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

export const generateFileHash = (file: File): string => {
  return `${file.name}-${file.size}-${file.lastModified}`;
};

export const checkDuplicateFiles = (files: File[], existingHashes: Set<string>): File[] => {
  const uniqueFiles: File[] = [];
  const seenHashes = new Set<string>();
  
  for (const file of files) {
    const hash = generateFileHash(file);
    
    // 既存のハッシュまたは既にこの処理で見たハッシュと重複していない場合のみ追加
    if (!existingHashes.has(hash) && !seenHashes.has(hash)) {
      uniqueFiles.push(file);
      seenHashes.add(hash);
    }
  }
  
  return uniqueFiles;
};

export const calculateTotalSize = (files: File[]): number => {
  return files.reduce((total, file) => total + file.size, 0);
};