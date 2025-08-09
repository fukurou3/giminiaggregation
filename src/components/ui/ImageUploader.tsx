"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { processImage, validateImageFile, formatFileSize, generateFileHashSync, checkDuplicateFiles, calculateTotalSize } from '@/lib/utils/imageUtils';
import { useImageWorker } from '@/hooks/useImageWorker';
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
  previewUrl?: string; // 5:3プレビュー用のBlob URL
  originalDimensions?: { width: number; height: number }; // 元画像サイズ
}

export const ImageUploader = ({
  images,
  onImagesChange,
  maxImages = 5,
  disabled = false
}: ImageUploaderProps) => {
  const { user } = useAuth();
  const { processImages, isWorkerSupported } = useImageWorker();
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevImagesRef = useRef<string[]>([]);
  const isInternalUpdateRef = useRef(false);
  const shouldUpdateParentRef = useRef(false);
  
  // メモリリーク防止: 作成したBlob URLをトラッキング
  const createdBlobUrlsRef = useRef<Set<string>>(new Set());

  // メモ化された画像配列の深い比較
  const memoizedImageItems = useMemo(() => {
    return images.map((url, index) => ({ 
      id: `existing-${index}`, 
      url,
      fileHash: `external-${url}` // 外部URLには特別なハッシュ
    }));
  }, [images]);

  const updateImages = useCallback((items: ImageItem[]) => {
    const urls = items.filter(item => item.url && !item.uploading).map(item => item.url);
    isInternalUpdateRef.current = true;
    onImagesChange(urls);
    // 次のレンダリング後にフラグをリセット
    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 0);
  }, [onImagesChange]);

  // 共通の画像処理・アップロード処理
  const handleFileProcessing = useCallback(async (filesToProcess: File[], newItems: ImageItem[]) => {
    try {
      // 画像を並列処理（WebWorkerまたはメインスレッド）
      const processedFiles = isWorkerSupported 
        ? await processImages(filesToProcess, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1200,
            aspectRatio: 5/3,
            removeExif: true
          })
        : await Promise.all(
            filesToProcess.map(file => processImage(file, {
              maxSizeMB: 0.5,
              maxWidthOrHeight: 1200,
              aspectRatio: 5/3,
              removeExif: true
            }))
          );

      // Firebase Storageにアップロード
      const uploadedUrls = await uploadMultipleImages(
        processedFiles,
        { userId: user.uid, folder: 'post-images' },
        setUploadProgress
      );

      // アップロード完了後、画像アイテムを更新（競合状態を回避）
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
        // 親への通知フラグを設定（非同期で安全に実行）
        shouldUpdateParentRef.current = true;
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
  }, [user, processImages, isWorkerSupported]);


  // imageItems変更時の親への安全な通知（競合状態防止）
  useEffect(() => {
    if (shouldUpdateParentRef.current) {
      const validItems = imageItems.filter(item => item.url && !item.uploading);
      updateImages(validItems);
      shouldUpdateParentRef.current = false;
    }
  }, [imageItems, updateImages]);

  // 親からの画像配列変更を安全に追随（無限ループ防止）
  useEffect(() => {
    // 内部更新による変更の場合は無視
    if (isInternalUpdateRef.current) {
      return;
    }

    // 深い比較で実際に変更があった場合のみ更新
    const imagesChanged = 
      prevImagesRef.current.length !== images.length ||
      prevImagesRef.current.some((prevUrl, index) => prevUrl !== images[index]);

    if (imagesChanged) {
      setImageItems(memoizedImageItems);
      prevImagesRef.current = [...images];
    }
  }, [images, memoizedImageItems]);

  // メモリリーク防止: コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      // 作成したすべてのBlob URLを解放
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

  // 5:3プレビューを生成する関数
  const generatePreview = useCallback(async (file: File): Promise<{ previewUrl: string; dimensions: { width: number; height: number } }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let blobUrl: string | null = null;

      const cleanup = () => {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          blobUrl = null;
        }
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        canvas.width = 0;
        canvas.height = 0;
        img.src = '';
      };

      if (!ctx) {
        cleanup();
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        try {
          const { width: imgWidth, height: imgHeight } = img;
          const aspectRatio = 5/3;
          
          // 切り抜きサイズを計算
          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = imgWidth;
          let sourceHeight = imgHeight;
          
          const currentRatio = imgWidth / imgHeight;
          
          if (currentRatio > aspectRatio) {
            sourceWidth = imgHeight * aspectRatio;
            sourceX = (imgWidth - sourceWidth) / 2;
          } else if (currentRatio < aspectRatio) {
            sourceHeight = imgWidth / aspectRatio;
            sourceY = (imgHeight - sourceHeight) / 2;
          }

          // プレビューサイズ（最大300px幅）
          const maxPreviewWidth = 300;
          const previewWidth = Math.min(maxPreviewWidth, sourceWidth);
          const previewHeight = previewWidth / aspectRatio;

          canvas.width = previewWidth;
          canvas.height = previewHeight;

          ctx.drawImage(
            img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, previewWidth, previewHeight
          );

          canvas.toBlob((blob) => {
            if (!blob) {
              cleanup();
              reject(new Error('Canvas to blob conversion failed'));
              return;
            }

            const previewUrl = URL.createObjectURL(blob);
            createdBlobUrlsRef.current.add(previewUrl);
            
            cleanup();
            resolve({ 
              previewUrl, 
              dimensions: { width: imgWidth, height: imgHeight }
            });
          }, 'image/jpeg', 0.9);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      img.onerror = () => {
        cleanup();
        reject(new Error('Failed to load image for preview'));
      };

      blobUrl = URL.createObjectURL(file);
      img.src = blobUrl;
    });
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    if (!user) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(validateImageFile);
    
    if (validFiles.length === 0) {
      alert('有効な画像ファイル（JPEG, PNG, WebP）を選択してください。\n対応形式: JPEG, PNG, WebP');
      return;
    }

    // より詳細なファイルサイズチェック
    const oversizedFiles = validFiles.filter(file => file.size > 10 * 1024 * 1024); // 10MB
    if (oversizedFiles.length > 0) {
      alert(`ファイルサイズが大きすぎます：\n${oversizedFiles.map(f => `${f.name}: ${formatFileSize(f.size)}`).join('\n')}\n\n個別ファイル制限: 10MB`);
      return;
    }

    // 既存ファイルのハッシュを取得
    const existingHashes = new Set(
      imageItems
        .filter(item => item.fileHash)
        .map(item => item.fileHash!)
    );

    // 重複除去（非同期ハッシュ生成）
    try {
      const { uniqueFiles, fileHashes } = await checkDuplicateFiles(validFiles, existingHashes);
      
      if (uniqueFiles.length === 0) {
        alert('選択されたファイルは既にアップロード済みです。');
        return;
      }

      if (uniqueFiles.length < validFiles.length) {
        alert(`重複ファイルをスキップしました: ${validFiles.length - uniqueFiles.length}件\n\n同じ画像が既にアップロード済みです。`);
      }

      const remainingSlots = maxImages - imageItems.length;
      const filesToProcess = uniqueFiles.slice(0, remainingSlots);
      const hashesToProcess = fileHashes.slice(0, remainingSlots);

      if (filesToProcess.length < uniqueFiles.length) {
        alert(`画像の選択上限に達しました。\n現在: ${imageItems.length}枚 / 最大: ${maxImages}枚\n\n${uniqueFiles.length - filesToProcess.length}枚をスキップします。`);
      }

      // 総容量チェック（4MB制限）
      const currentTotalSize = imageItems.reduce((total, item) => {
        return item.file ? total + item.file.size : total;
      }, 0);
      const newTotalSize = calculateTotalSize(filesToProcess);
      const maxTotalSize = 4 * 1024 * 1024; // 4MB

      if (currentTotalSize + newTotalSize > maxTotalSize) {
        alert(`容量制限を超えています：\n現在の容量: ${formatFileSize(currentTotalSize)}\n追加予定: ${formatFileSize(newTotalSize)}\n制限: ${formatFileSize(maxTotalSize)}\n\nより小さな画像を選択するか、既存の画像を削除してください。`);
        return;
      }

      // プレビューを生成
      const previewPromises = filesToProcess.map(async (file, index) => {
        try {
          const { previewUrl, dimensions } = await generatePreview(file);
          return {
            id: `uploading-${Date.now()}-${index}`,
            url: '',
            file,
            fileHash: hashesToProcess[index],
            uploading: true,
            previewUrl,
            originalDimensions: dimensions
          };
        } catch (error) {
          console.warn(`Failed to generate preview for ${file.name}:`, error);
          return {
            id: `uploading-${Date.now()}-${index}`,
            url: '',
            file,
            fileHash: hashesToProcess[index],
            uploading: true,
            error: 'プレビュー生成に失敗しました'
          };
        }
      });

      const newItems: ImageItem[] = await Promise.all(previewPromises);

      setImageItems(prev => [...prev, ...newItems]);
      
      // 共通の処理関数を使用
      handleFileProcessing(filesToProcess, newItems);
      
    } catch (hashError) {
      console.error('Hash generation failed:', hashError);
      alert('ファイルの重複チェック中にエラーが発生しました。同期版ハッシュを使用します。');
      
      // フォールバック: 同期版ハッシュを使用（重複チェックなしで実行）
      const remainingSlots = maxImages - imageItems.length;
      const fallbackFilesToProcess = validFiles.slice(0, remainingSlots);
      
      const fallbackItems: ImageItem[] = fallbackFilesToProcess.map((file, index) => ({
        id: `uploading-${Date.now()}-${index}`,
        url: '',
        file,
        fileHash: generateFileHashSync(file), // 同期版フォールバック
        uploading: true
      }));

      setImageItems(prev => [...prev, ...fallbackItems]);
      
      // フォールバック用のファイル処理を実行
      handleFileProcessing(fallbackFilesToProcess, fallbackItems);
    }
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
      // 削除する画像のBlob URLをクリーンアップ
      const itemToRemove = prev.find(item => item.id === id);
      if (itemToRemove) {
        // アップロード中の画像URL
        if (itemToRemove.url && itemToRemove.url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(itemToRemove.url);
            createdBlobUrlsRef.current.delete(itemToRemove.url);
          } catch (error) {
            console.warn('Failed to revoke blob URL during removal:', itemToRemove.url, error);
          }
        }
        // プレビューURL
        if (itemToRemove.previewUrl) {
          try {
            URL.revokeObjectURL(itemToRemove.previewUrl);
            createdBlobUrlsRef.current.delete(itemToRemove.previewUrl);
          } catch (error) {
            console.warn('Failed to revoke preview URL during removal:', itemToRemove.previewUrl, error);
          }
        }
      }
      
      const updated = prev.filter(item => item.id !== id);
      // 非同期で親を更新するためフラグを設定
      shouldUpdateParentRef.current = true;
      return updated;
    });
  }, []);

  const moveImage = useCallback((dragIndex: number, dropIndex: number) => {
    setImageItems(prev => {
      const updated = [...prev];
      const draggedItem = updated[dragIndex];
      updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, draggedItem);
      // 非同期で親を更新するためフラグを設定
      shouldUpdateParentRef.current = true;
      return updated;
    });
  }, []);

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
            JPEG, PNG, WebP形式 / 最大{maxImages}枚 / 個別ファイル制限: 10MB
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            🎨 5:3比率に自動切り抜き • 🔒 EXIF除去 • 📊 総容量制限: 4MB {isWorkerSupported ? '• ⚡ 並列処理対応' : ''}
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
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50">
                  {item.previewUrl ? (
                    <>
                      <img 
                        src={item.previewUrl}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover opacity-60"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        <p className="text-white text-xs mt-2">アップロード中...</p>
                        {item.originalDimensions && (
                          <p className="text-white text-xs opacity-80">
                            {item.originalDimensions.width}×{item.originalDimensions.height}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  )}
                </div>
              ) : item.error ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-red-500 bg-red-50">
                  <ImageIcon size={24} />
                  <p className="text-xs mt-1 px-2 text-center">{item.error}</p>
                  {item.originalDimensions && (
                    <p className="text-xs text-gray-500 mt-1">
                      {item.originalDimensions.width}×{item.originalDimensions.height}
                    </p>
                  )}
                </div>
              ) : item.url ? (
                <img 
                  src={item.url} 
                  alt={`Upload ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : null}

              {/* 5:3比率インジケーター（アップロード中のみ） */}
              {item.uploading && item.originalDimensions && (
                <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                  5:3に切抜
                </div>
              )}
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