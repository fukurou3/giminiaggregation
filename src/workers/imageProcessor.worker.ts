/**
 * WebWorker for parallel image processing
 * Handles image compression, resizing, and aspect ratio cropping
 */

interface ProcessImageOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  aspectRatio: number;
  removeExif?: boolean;
}

interface ProcessImageRequest {
  imageData: ArrayBuffer;
  fileName: string;
  options: ProcessImageOptions;
}

interface ProcessImageResponse {
  success: boolean;
  processedImage?: ArrayBuffer;
  fileName: string;
  error?: string;
}

// Import imageCompression dynamically in worker context
let imageCompression: typeof import('browser-image-compression').default | null = null;

async function loadImageCompression() {
  if (!imageCompression) {
    try {
      // Dynamic import for worker context
      const compressionModule = await import('browser-image-compression');
      imageCompression = compressionModule.default;
    } catch (error) {
      console.error('Failed to load browser-image-compression in worker:', error);
      throw new Error('Image compression library not available');
    }
  }
  return imageCompression;
}

async function removeExifInWorker(file: File): Promise<File> {
  try {
    // Web Worker環境では createImageBitmap を使用
    const imageBitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas context not available in worker');
    }

    // ImageBitmapをcanvasに描画（EXIF情報が除去される）
    ctx.drawImage(imageBitmap, 0, 0);
    
    // Blobに変換
    const blob = await canvas.convertToBlob({
      type: file.type,
      quality: 0.95
    });
    
    if (!blob) {
      throw new Error('Failed to create blob from canvas');
    }
    
    // 新しいFileオブジェクトを作成（EXIF情報なし）
    const cleanFile = new File([blob], file.name, { type: file.type });
    
    // ImageBitmapのクリーンアップ
    imageBitmap.close();
    
    return cleanFile;
  } catch (error) {
    throw new Error(`EXIF removal failed: ${error}`);
  }
}

async function processImageInWorker(
  imageData: ArrayBuffer,
  fileName: string,
  options: ProcessImageOptions
): Promise<ArrayBuffer> {
  const compression = await loadImageCompression();
  
  // Convert ArrayBuffer to File
  let file = new File([imageData], fileName, {
    type: getImageMimeType(fileName)
  });

  // 1. Remove EXIF data if requested
  if (options.removeExif !== false) {
    try {
      file = await removeExifInWorker(file);
    } catch (error) {
      console.error(`EXIF removal failed for ${fileName}:`, error);
      // セキュリティ強化: EXIF除去失敗時は即エラー（未サニタイズのアップロード禁止）
      throw new Error(`画像のメタデータ除去に失敗しました: ${fileName}`);
    }
  }

  // 2. Process with aspect ratio cropping and compression
  const processedFile = await compression(file, {
    maxSizeMB: options.maxSizeMB,
    maxWidthOrHeight: options.maxWidthOrHeight,
    useWebWorker: false, // Disable nested workers
    fileType: getImageMimeType(fileName),
    initialQuality: 0.8,
    alwaysKeepResolution: false,
    onProgress: () => {}, // No progress callback in worker
  });

  // Apply aspect ratio cropping if needed
  if (options.aspectRatio) {
    const croppedFile = await cropToAspectRatio(processedFile, options.aspectRatio);
    return await croppedFile.arrayBuffer();
  }

  return await processedFile.arrayBuffer();
}

async function cropToAspectRatio(file: File, targetRatio: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = new OffscreenCanvas(1, 1);
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available in worker'));
      return;
    }

    img.onload = () => {
      try {
        const { width: imgWidth, height: imgHeight } = img;
        
        // Calculate crop dimensions
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = imgWidth;
        let sourceHeight = imgHeight;
        
        const currentRatio = imgWidth / imgHeight;
        
        if (currentRatio > targetRatio) {
          sourceWidth = imgHeight * targetRatio;
          sourceX = (imgWidth - sourceWidth) / 2;
        } else if (currentRatio < targetRatio) {
          sourceHeight = imgWidth / targetRatio;
          sourceY = (imgHeight - sourceHeight) / 2;
        }

        canvas.width = sourceWidth;
        canvas.height = sourceHeight;

        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, sourceWidth, sourceHeight
        );

        canvas.convertToBlob({
          type: file.type,
          quality: 0.9
        }).then(blob => {
          if (blob) {
            const croppedFile = new File([blob], file.name, { type: file.type });
            resolve(croppedFile);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        }).catch(reject);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image in worker'));
    
    // Create blob URL for the image
    const blob = new Blob([file], { type: file.type });
    img.src = URL.createObjectURL(blob);
  });
}

function getImageMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

// Worker message handler
self.onmessage = async (event: MessageEvent<ProcessImageRequest>) => {
  const { imageData, fileName, options } = event.data;

  try {
    const processedImage = await processImageInWorker(imageData, fileName, options);
    
    const response: ProcessImageResponse = {
      success: true,
      processedImage,
      fileName
    };
    
    self.postMessage(response);
  } catch (error) {
    const response: ProcessImageResponse = {
      success: false,
      fileName,
      error: error instanceof Error ? error.message : 'Unknown processing error'
    };
    
    self.postMessage(response);
  }
};

// Handle worker errors
self.onerror = (error) => {
  console.error('Worker error:', error);
};

export {};