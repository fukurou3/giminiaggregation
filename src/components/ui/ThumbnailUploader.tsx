"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { validateImageFile, formatFileSize, generateFileHashSync, checkDuplicateFiles, calculateTotalSize } from '@/lib/utils/imageUtils';
import { uploadMultipleImages } from '@/lib/utils/storageUtils';
import { CropMeta, generateCropMeta } from '@/types/CropMeta';
import { useAuth } from '@/hooks/useAuth';

export interface ThumbnailUploaderProps {
  image: string;
  onImageChange: (image: string) => void;
  disabled?: boolean;
  onUploadRef?: React.MutableRefObject<(() => Promise<string>) | null>;
}

interface ImageItem {
  id: string;
  url: string;
  file?: File;
  fileHash?: string;
  uploading?: boolean;
  error?: string;
  previewUrl?: string;
  originalDimensions?: { width: number; height: number };
  cropMeta?: CropMeta;
}

export const ThumbnailUploader = ({
  image,
  onImageChange,
  disabled = false,
  onUploadRef
}: ThumbnailUploaderProps) => {
  const { user } = useAuth();
  const [imageItem, setImageItem] = useState<ImageItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createdBlobUrlsRef = useRef<Set<string>>(new Set());

  // 実際のアップロード処理（5:3クロップ）
  const handleActualUpload = useCallback(async (): Promise<string> => {
    if (!user || !imageItem?.file) {
      throw new Error('認証またはファイルが必要です');
    }

    const cropMeta = generateCropMeta(
      imageItem.originalDimensions?.width || 1000,
      imageItem.originalDimensions?.height || 600,
      5/3,
      'thumbnail'
    );

    try {
      const results = await uploadMultipleImages([imageItem.file], {
        userId: user.uid,
        folder: 'thumbnails',
        mode: 'thumbnail',
        metadata: [{ cropMeta }]
      }, (progress) => {
        setUploadProgress(progress.percentage);
      });

      setUploadProgress(0);
      return results[0] || '';
    } catch (error) {
      setUploadProgress(0);
      throw error;
    }
  }, [user, imageItem]);

  // アップロード関数を親コンポーネントに公開
  useEffect(() => {
    if (onUploadRef) {
      onUploadRef.current = handleActualUpload;
    }
  }, [handleActualUpload, onUploadRef]);

  // 軽量即出しプレビュー生成
  const generateInstantPreview = useCallback((file: File): Promise<{ previewUrl: string; dimensions: { width: number; height: number } }> => {
    return new Promise((resolve) => {
      const previewUrl = URL.createObjectURL(file);
      createdBlobUrlsRef.current.add(previewUrl);

      const img = new Image();
      img.onload = () => {
        resolve({
          previewUrl,
          dimensions: { width: img.width, height: img.height }
        });
      };
      img.onerror = () => {
        resolve({
          previewUrl,
          dimensions: { width: 0, height: 0 }
        });
      };
      img.src = previewUrl;
    });
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    if (!user) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(validateImageFile);
    
    if (validFiles.length === 0) {
      alert('有効な画像ファイル（JPEG, PNG, WebP）を選択してください。');
      return;
    }

    const file = validFiles[0]; // サムネイルは1枚のみ
    
    if (file.size > 10 * 1024 * 1024) {
      alert(`ファイルサイズが大きすぎます：${formatFileSize(file.size)}\n制限: 10MB`);
      return;
    }

    try {
      const { previewUrl, dimensions } = await generateInstantPreview(file);
      const newItem: ImageItem = {
        id: `thumbnail-${Date.now()}`,
        url: '',
        file,
        fileHash: generateFileHashSync(file),
        uploading: false,
        previewUrl,
        originalDimensions: dimensions
      };

      setImageItem(newItem);
      onImageChange(previewUrl);
    } catch (error) {
      console.error('Preview generation failed:', error);
      alert('プレビュー生成に失敗しました。');
    }
  }, [user, generateInstantPreview, onImageChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [disabled, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 100);
  }, [handleFileSelect]);

  const removeImage = useCallback(() => {
    if (imageItem) {
      // プレビューURL（新規アップロード時のBlob URL）のクリーンアップ
      if (imageItem.previewUrl && imageItem.previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(imageItem.previewUrl);
          createdBlobUrlsRef.current.delete(imageItem.previewUrl);
        } catch (error) {
          console.warn('Failed to revoke preview URL:', error);
        }
      }
    }
    
    setImageItem(null);
    onImageChange('');
  }, [imageItem, onImageChange]);

  // 既存の画像URLをimageItemに反映
  useEffect(() => {
    if (image && !image.startsWith('blob:') && !imageItem?.previewUrl) {
      // 既存の画像URL（サーバーから取得したURL）をimageItemとして設定
      const existingImageItem: ImageItem = {
        id: `existing-${Date.now()}`,
        url: image,
        fileHash: `external-${image}`,
        uploading: false
      };
      setImageItem(existingImageItem);
    } else if (!image && imageItem) {
      // 画像がクリアされた場合
      setImageItem(null);
    }
  }, [image, imageItem?.previewUrl]);

  // メモリリーク防止
  useEffect(() => {
    return () => {
      const blobUrls = createdBlobUrlsRef.current;
      blobUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.warn('Failed to revoke blob URL:', url, error);
        }
      });
      blobUrls.clear();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* アップロード進捗 */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* サムネイル表示エリア */}
      <div className="w-full max-w-md">
        {imageItem ? (
          <div className="relative aspect-[5/3] bg-muted rounded-lg overflow-hidden border border-border">
            <img 
              src={imageItem.previewUrl || imageItem.url}
              alt="サムネイル"
              className="w-full h-full object-cover"
            />
            
            {/* 削除ボタン */}
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 z-10 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
              disabled={disabled}
            >
              <X size={16} />
            </button>

            {/* アップロード中オーバーレイ */}
            {imageItem.uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}

            {/* エラー表示 */}
            {imageItem.error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 bg-red-50">
                <ImageIcon size={24} />
                <p className="text-xs mt-1 px-2 text-center">{imageItem.error}</p>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
              ${isDragging 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (!disabled && fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
              }
            }}
          >
            <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground mb-2">
              サムネイル画像を選択
            </p>
            <p className="text-sm text-muted-foreground">
              JPEG, PNG, WebP形式 / 1枚のみ
            </p>


            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileInputChange}
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  );
};