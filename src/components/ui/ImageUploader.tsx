"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { processImage, validateImageFile, formatFileSize, generateFileHash, checkDuplicateFiles, calculateTotalSize } from '@/lib/utils/imageUtils';
import { uploadMultipleImages } from '@/lib/utils/storageUtils';
import { useAuth } from '@/hooks/useAuth';

export interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

interface ImageItem {
  id: string;
  url: string;
  file?: File;
  fileHash?: string;
  uploading?: boolean;
  error?: string;
}

export const ImageUploader = ({
  images,
  onImagesChange,
  maxImages = 5,
  disabled = false
}: ImageUploaderProps) => {
  const { user } = useAuth();
  const [imageItems, setImageItems] = useState<ImageItem[]>(
    images.map((url, index) => ({ id: `existing-${index}`, url }))
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateImages = useCallback((items: ImageItem[]) => {
    const urls = items.filter(item => item.url && !item.uploading).map(item => item.url);
    onImagesChange(urls);
  }, [onImagesChange]);

  // 親からの画像配列変更に追随
  useEffect(() => {
    setImageItems(images.map((url, index) => ({ id: `existing-${index}`, url })));
  }, [images]);

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    if (!user) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(validateImageFile);
    
    if (validFiles.length === 0) {
      alert('有効な画像ファイル（JPEG, PNG, WebP）を選択してください。');
      return;
    }

    // 既存ファイルのハッシュを取得
    const existingHashes = new Set(
      imageItems
        .filter(item => item.fileHash)
        .map(item => item.fileHash!)
    );

    // 重複除去
    const uniqueFiles = checkDuplicateFiles(validFiles, existingHashes);
    
    if (uniqueFiles.length === 0) {
      alert('選択されたファイルは既にアップロード済みです。');
      return;
    }

    if (uniqueFiles.length < validFiles.length) {
      alert(`${validFiles.length - uniqueFiles.length}件の重複ファイルをスキップしました。`);
    }

    const remainingSlots = maxImages - imageItems.length;
    const filesToProcess = uniqueFiles.slice(0, remainingSlots);

    if (filesToProcess.length < uniqueFiles.length) {
      alert(`最大${maxImages}枚まで選択できます。`);
    }

    // 総容量チェック（4MB制限）
    const currentTotalSize = imageItems.reduce((total, item) => {
      return item.file ? total + item.file.size : total;
    }, 0);
    const newTotalSize = calculateTotalSize(filesToProcess);
    const maxTotalSize = 4 * 1024 * 1024; // 4MB

    if (currentTotalSize + newTotalSize > maxTotalSize) {
      alert(`総容量が制限（4MB）を超えています。現在の容量: ${formatFileSize(currentTotalSize)}, 追加予定: ${formatFileSize(newTotalSize)}`);
      return;
    }

    // 画像アイテムを追加（アップロード中状態）
    const newItems: ImageItem[] = filesToProcess.map((file, index) => ({
      id: `uploading-${Date.now()}-${index}`,
      url: '',
      file,
      fileHash: generateFileHash(file),
      uploading: true
    }));

    setImageItems(prev => [...prev, ...newItems]);

    try {
      // 画像を処理（5:3比率に切り抜き、圧縮）
      const processedFiles = await Promise.all(
        filesToProcess.map(file => processImage(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          aspectRatio: 5/3
        }))
      );

      // Firebase Storageにアップロード
      const uploadedUrls = await uploadMultipleImages(
        processedFiles,
        { userId: user.uid, folder: 'post-images' },
        setUploadProgress
      );

      // アップロード完了後、画像アイテムを更新
      setImageItems(prev => {
        const updated = [...prev];
        newItems.forEach((item, index) => {
          const itemIndex = updated.findIndex(i => i.id === item.id);
          if (itemIndex !== -1) {
            updated[itemIndex] = {
              ...item,
              url: uploadedUrls[index],
              uploading: false,
              file: undefined
            };
          }
        });
        // 親フォームへの反映
        updateImages(updated);
        return updated;
      });

    } catch (error) {
      console.error('Upload failed:', error);
      
      // エラーが発生した場合、アップロード中のアイテムにエラーを設定
      setImageItems(prev => {
        const updated = [...prev];
        newItems.forEach(item => {
          const itemIndex = updated.findIndex(i => i.id === item.id);
          if (itemIndex !== -1) {
            updated[itemIndex] = {
              ...item,
              uploading: false,
              error: 'アップロードに失敗しました'
            };
          }
        });
        return updated;
      });
    }
    
    setUploadProgress(0);
  }, [user, maxImages, imageItems.length]);

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
    if (files) {
      handleFileSelect(files);
    }
    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  const removeImage = useCallback((id: string) => {
    setImageItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      updateImages(updated);
      return updated;
    });
  }, [updateImages]);

  const moveImage = useCallback((dragIndex: number, dropIndex: number) => {
    setImageItems(prev => {
      const updated = [...prev];
      const draggedItem = updated[dragIndex];
      updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, draggedItem);
      updateImages(updated);
      return updated;
    });
  }, [updateImages]);

  const canAddMore = imageItems.length < maxImages;

  return (
    <div className="space-y-4">
      {/* アップロードエリア */}
      {canAddMore && (
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
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground mb-2">
            画像をドロップまたはクリックして選択
          </p>
          <p className="text-sm text-muted-foreground">
            JPEG, PNG, WebP形式 / 最大{maxImages}枚 / 5:3比率に自動切り抜き
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
            disabled={disabled}
          />
        </div>
      )}

      {/* アップロード進捗 */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* 画像グリッド */}
      {imageItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {imageItems.map((item, index) => (
            <div 
              key={item.id}
              className="relative group aspect-[5/3] bg-muted rounded-lg overflow-hidden border border-border"
              draggable={!item.uploading && !disabled}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', index.toString());
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                if (dragIndex !== index) {
                  moveImage(dragIndex, index);
                }
              }}
            >
              {/* 順番番号 */}
              <div className="absolute top-2 left-2 z-10">
                <span className="bg-black/70 text-white text-sm font-bold px-2 py-1 rounded">
                  {index + 1}
                </span>
              </div>

              {/* 削除ボタン */}
              {!item.uploading && (
                <button
                  onClick={() => removeImage(item.id)}
                  className="absolute top-2 right-2 z-10 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  disabled={disabled}
                >
                  <X size={16} />
                </button>
              )}

              {/* 画像またはローディング */}
              {item.uploading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : item.error ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-red-500">
                  <ImageIcon size={24} />
                  <p className="text-xs mt-1">{item.error}</p>
                </div>
              ) : item.url ? (
                <img 
                  src={item.url} 
                  alt={`Upload ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* 制限メッセージ */}
      {imageItems.length >= maxImages && (
        <p className="text-sm text-muted-foreground text-center">
          最大{maxImages}枚まで選択されています
        </p>
      )}
    </div>
  );
};