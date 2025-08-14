"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Upload, X, Image as ImageIcon, GripVertical } from 'lucide-react';
import { validateImageFile, formatFileSize, generateFileHashSync, checkDuplicateFiles, calculateTotalSize } from '@/lib/utils/imageUtils';
import { uploadMultipleImages } from '@/lib/utils/storageUtils';
import { CropMeta, generateCropMeta } from '@/types/CropMeta';
import { useAuth } from '@/hooks/useAuth';

export interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
  mode?: 'post' | 'avatar' | 'pr';
  onUploadRef?: React.MutableRefObject<(() => Promise<string[]>) | null>; // 実際のアップロード関数を外部に公開
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
  cropMeta?: CropMeta; // クロップメタデータ
}

export const ImageUploader = ({
  images,
  onImagesChange,
  maxImages = 5,
  disabled = false,
  mode = 'post',
  onUploadRef
}: ImageUploaderProps) => {
  const { user } = useAuth();
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const [overRect, setOverRect] = useState<DOMRect | null>(null);
  
  // 追加: モバイル用の Pointer DnD 状態
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const [dragOverlayPos, setDragOverlayPos] = useState<{x:number;y:number;width:number;height:number} | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevImagesRef = useRef<string[]>([]);
  const isInternalUpdateRef = useRef(false);
  const shouldUpdateParentRef = useRef(false);
  
  // メモリリーク防止: 作成したBlob URLをトラッキング
  const createdBlobUrlsRef = useRef<Set<string>>(new Set());

  // 透明ドラッグ画像（既定ゴーストを消す）
  const transparentImg = useMemo(() => {
    const img = new Image();
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9U2j1W0AAAAASUVORK5CYII=';
    return img;
  }, []);

  // rAF で onDragOver をスムーズに（ちらつき抑制）
  let rafId: number | null = null;
  const schedule = (fn: () => void) => {
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(fn);
  };

  // ポインタ位置から「もっとも近いセル index」を求める
  const getIndexFromPoint = (x: number, y: number) => {
    const grid = gridRef.current;
    if (!grid) return null;
    const cards = Array.from(grid.querySelectorAll<HTMLDivElement>('[data-idx]'));
    if (!cards.length) return null;
    let best = { idx: 0, d: Infinity, rect: cards[0].getBoundingClientRect() };
    for (const el of cards) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = cx - x;
      const dy = cy - y;
      const d = dx * dx + dy * dy;
      if (d < best.d) best = { idx: Number(el.dataset.idx), d, rect };
    }
    return best;
  };

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

  // 投稿前の軽量処理（ファイル保持のみ、アップロードは投稿時まで保留）
  const handleFileSelection = useCallback((filesToProcess: File[], newItems: ImageItem[]) => {
    
    // ファイルを保持し、投稿ボタンが押されるまでアップロードは実行しない
    setImageItems(prev => [...prev, ...newItems]);
    
    // ファイル参照のみを親に通知（実際のアップロードURLではない）
    const fileUrls = newItems.map(item => item.previewUrl || '');
    onImagesChange([...images, ...fileUrls]);
  }, [images, onImagesChange]);


  // imageItems変更時の親への安全な通知（競合状態防止）
  // Note: 主な通知は直接呼び出しで行うが、削除や並び替え時の安全な通知のために残す
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

  // 投稿時の実際のアップロード処理（5:3クロップは一枚目のみ）
  const handleActualUpload = useCallback(async (): Promise<string[]> => {
    if (!user) {
      throw new Error('認証が必要です');
    }

    const filesToUpload = imageItems
      .filter(item => item.file && !item.uploading && !item.error)
      .map(item => item.file!);

    if (filesToUpload.length === 0) {
      return [];
    }

    // メタデータを生成（PRモードはクロップなし）
    const metadata = filesToUpload.map((file, index) => {
      const item = imageItems.find(item => item.file === file);
      if (!item || !item.originalDimensions) {
        return {};
      }

      // PRモードは元の比率を維持するメタデータを追加
      if (mode === 'pr') {
        return {
          cropMode: 'original', // 元の比率を維持することを示すフラグ
          aspectRatio: 'original'
        };
      }

      // 一枚目のみ5:3クロップメタデータを生成（postモードのみ）
      if (index === 0 && mode === 'post') {
        const cropMeta = generateCropMeta(
          item.originalDimensions.width,
          item.originalDimensions.height,
          5/3,
          'post'
        );
        return { cropMeta };
      }

      // アバターモードは1:1クロップ
      if (mode === 'avatar') {
        const cropMeta = generateCropMeta(
          item.originalDimensions.width,
          item.originalDimensions.height,
          1,
          'avatar'
        );
        return { cropMeta };
      }

      // それ以外はクロップメタデータなし
      return {};
    });

    try {
      const results = await uploadMultipleImages(filesToUpload, {
        userId: user.uid,
        folder: mode === 'avatar' ? 'avatars' : mode === 'pr' ? 'pr-images' : 'post-images',
        mode,
        metadata
      }, (progress) => {
        setUploadProgress(progress.percentage);
      });

      // アップロード完了後のクリーンアップ
      setUploadProgress(0);
      return results;
    } catch (error) {
      setUploadProgress(0);
      throw error;
    }
  }, [user, imageItems, mode]);

  // アップロード関数を親コンポーネントに公開
  useEffect(() => {
    if (onUploadRef) {
      onUploadRef.current = handleActualUpload;
    }
  }, [handleActualUpload, onUploadRef]);

  // 軽量即出しプレビュー生成（クロップ処理なし）
  const generateInstantPreview = useCallback((file: File): Promise<{ previewUrl: string; dimensions: { width: number; height: number } }> => {
    return new Promise((resolve) => {
      // Object URLを即座に生成（処理なし）
      const previewUrl = URL.createObjectURL(file);
      createdBlobUrlsRef.current.add(previewUrl);

      // 画像サイズを取得
      const img = new Image();
      img.onload = () => {
        resolve({
          previewUrl,
          dimensions: { width: img.width, height: img.height }
        });
      };
      img.onerror = () => {
        // エラー時もプレビューURLは返す
        resolve({
          previewUrl,
          dimensions: { width: 0, height: 0 }
        });
      };
      img.src = previewUrl;
    });
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    
    if (!user) {
      return;
    }

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

      // 総容量チェック（アップロード前: 30MB、処理後目標: 4MB）
      const currentTotalSize = imageItems.reduce((total, item) => {
        return item.file ? total + item.file.size : total;
      }, 0);
      const newTotalSize = calculateTotalSize(filesToProcess);
      const maxTotalSize = 30 * 1024 * 1024; // 30MB（UX確保のためアップロード前制限を緩和）

      if (currentTotalSize + newTotalSize > maxTotalSize) {
        alert(`容量制限を超えています：\n現在の容量: ${formatFileSize(currentTotalSize)}\n追加予定: ${formatFileSize(newTotalSize)}\n制限: ${formatFileSize(maxTotalSize)}\n\nより小さな画像を選択するか、既存の画像を削除してください。`);
        return;
      }

      // 軽量即出しプレビューを生成
      const previewPromises = filesToProcess.map(async (file, index) => {
        try {
          const { previewUrl, dimensions } = await generateInstantPreview(file);
          return {
            id: `selected-${Date.now()}-${index}`,
            url: '', // アップロードURLは投稿時まで空
            file,
            fileHash: hashesToProcess[index],
            uploading: false, // 選択段階ではアップロード中ではない
            previewUrl,
            originalDimensions: dimensions
          };
        } catch (error) {
          console.warn(`Failed to generate preview for ${file.name}:`, error);
          return {
            id: `selected-${Date.now()}-${index}`,
            url: '',
            file,
            fileHash: hashesToProcess[index],
            uploading: false,
            error: 'プレビュー生成に失敗しました'
          };
        }
      });

      const newItems: ImageItem[] = await Promise.all(previewPromises);

      // 軽量選択処理を使用（アップロードは投稿時まで保留）
      handleFileSelection(filesToProcess, newItems);
      
    } catch (hashError) {
      console.error('Hash generation failed:', hashError);
      alert('ファイルの重複チェック中にエラーが発生しました。同期版ハッシュを使用します。');
      
      // フォールバック: 同期版ハッシュを使用（重複チェックなしで実行）
      const remainingSlots = maxImages - imageItems.length;
      const fallbackFilesToProcess = validFiles.slice(0, remainingSlots);
      
      const fallbackItems: ImageItem[] = fallbackFilesToProcess.map((file, index) => {
        const fallbackCropMeta = generateCropMeta(
          1000, 600, // デフォルト値
          mode === 'avatar' ? 1 : 5/3,
          mode // modeパラメータを追加
        );
        return {
          id: `uploading-${Date.now()}-${index}`,
          url: '',
          file,
          fileHash: generateFileHashSync(file), // 同期版フォールバック
          uploading: true,
          cropMeta: fallbackCropMeta
        };
      });

      setImageItems(prev => [...prev, ...fallbackItems]);
      
      // フォールバック：軽量選択処理を使用
      handleFileSelection(fallbackFilesToProcess, fallbackItems);
    }
  }, [user, maxImages, imageItems, generateInstantPreview, handleFileSelection, mode]);

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
    
    // ファイル入力を即座にリセット（再選択を可能にする）
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 100);
  }, [handleFileSelect, imageItems.length]);

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
      {canAddMore && imageItems.length === 0 && (
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
          onClick={() => {
            if (!disabled && fileInputRef.current) {
              fileInputRef.current.value = '';
              fileInputRef.current.click();
            }
          }}
        >
          <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground mb-2">
            {mode === 'pr' ? 'PR画像' : '画像'}を選択
          </p>
          <p className="text-sm text-muted-foreground">
            JPEG, PNG, WebP形式 / 最大{maxImages}枚
          </p>
          {mode === 'post' && (
            <p className="text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded mt-3">
              ⚠️ 一枚目に指定された画像は5:3に切り抜かれサムネ画像として使用されます
            </p>
          )}


          
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
        <div
          ref={gridRef}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 relative"
        >
          {imageItems.map((item, index) => (
            <div 
              key={item.id}
              data-idx={index}
              className={`relative group ${mode === 'avatar' ? 'aspect-square' : 'aspect-[5/3]'} bg-muted rounded-lg overflow-hidden border border-border
                ${draggedItemIndex === index ? 'opacity-50 scale-95' : ''}
                ${!item.uploading && !disabled ? 'cursor-move' : ''}
                transition-all duration-150
              `}
              style={{
                touchAction: !item.uploading && !disabled ? 'none' : 'auto'
              }}
              draggable={!item.uploading && !disabled}
              onDragStart={(e) => {
                e.dataTransfer.setDragImage(transparentImg, 0, 0);
                setDraggedItemIndex(index);
                setOverIndex(index);
              }}
              onDragEnd={() => {
                setDraggedItemIndex(null);
                setOverIndex(null);

                setOverRect(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                schedule(() => {
                  const best = getIndexFromPoint(e.clientX, e.clientY);
                  if (!best) return;
                  setOverIndex(best.idx);
                  setOverRect(best.rect);
                });
              }}
              onDrop={(e) => {
                e.preventDefault();
                const dragIndex = draggedItemIndex;
                const dropIndex = overIndex;
                setDraggedItemIndex(null);
                setOverIndex(null);

                setOverRect(null);
                if (
                  typeof dragIndex === 'number' &&
                  typeof dropIndex === 'number' &&
                  dragIndex !== dropIndex
                ) {
                  moveImage(dragIndex, dropIndex);
                }
              }}
              onPointerDown={(e) => {
                // マウスは既存の onDragStart に任せる
                if (e.pointerType === 'mouse' || item.uploading || disabled) return;

                // タッチ/ペン → Pointer DnD 開始
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                pointerIdRef.current = e.pointerId;
                setIsTouchDragging(true);
                setDraggedItemIndex(index);
                setOverIndex(index);

                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                setOverRect(rect); // 既存のプレースホルダーに反映
                setDragOverlayPos({ x: e.clientX - rect.width/2, y: e.clientY - rect.height/2, width: rect.width, height: rect.height });
              }}
              onPointerUp={(e) => {
                if (!isTouchDragging || pointerIdRef.current !== e.pointerId) return;
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                setIsTouchDragging(false);

                const dragIndex = draggedItemIndex;
                const dropIndex = overIndex;
                setDraggedItemIndex(null);
                setOverIndex(null);
                setOverRect(null);
                setDragOverlayPos(null);
                pointerIdRef.current = null;
                if (typeof dragIndex === 'number' && typeof dropIndex === 'number' && dragIndex !== dropIndex) {
                  moveImage(dragIndex, dropIndex);
                }
              }}
              onPointerCancel={() => {
                if (!isTouchDragging) return;
                setIsTouchDragging(false);
                setDraggedItemIndex(null);
                setOverIndex(null);
                setOverRect(null);
                setDragOverlayPos(null);
                pointerIdRef.current = null;
              }}
              onPointerMove={(e) => {
                // タッチ中だけ追従（スクロール抑止）
                if (!isTouchDragging || pointerIdRef.current !== e.pointerId) return;
                e.preventDefault(); // 重要: ページスクロールを止める
                schedule(() => {
                  setDragOverlayPos(pos => pos ? { ...pos, x: e.clientX - pos.width/2, y: e.clientY - pos.height/2 } : pos);
                  const best = getIndexFromPoint(e.clientX, e.clientY);
                  if (!best) return;
                  setOverIndex(best.idx);
                  setOverRect(best.rect);
                });
              }}
            >
              {/* 順番番号とドラッグハンドル */}
              <div className="absolute top-2 left-2 z-10">
                {!item.uploading && !disabled ? (
                  <div 
                    className="bg-black/70 text-white text-sm font-bold px-2 py-1 rounded flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity duration-200 cursor-move select-none"
                    style={{ 
                      touchAction: 'none',
                      WebkitTouchCallout: 'none',
                      WebkitUserSelect: 'none'
                    }}
                  >
                    <GripVertical size={12} />
                    {index + 1}
                  </div>
                ) : (
                  <span className="bg-black/70 text-white text-sm font-bold px-2 py-1 rounded">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* 削除ボタン - 常時表示 */}
              {!item.uploading && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(item.id);
                  }}
                  className="absolute top-2 right-2 z-10 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors select-none"
                  disabled={disabled}
                  style={{ touchAction: 'manipulation' }}
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

                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>

                    </div>
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

            </div>
          ))}
          
          {/* プレースホルダーオーバーレイ */}
          {draggedItemIndex != null && overRect && (
            <div
              aria-hidden
              className="pointer-events-none absolute z-20 border-2 border-dashed border-primary/80 rounded-lg bg-primary/5 transition-transform duration-100"
              style={{
                left: overRect.left - gridRef.current!.getBoundingClientRect().left,
                top: overRect.top - gridRef.current!.getBoundingClientRect().top,
                width: overRect.width,
                height: overRect.height,
                transform: 'translateZ(0)', // 合成レイヤでちらつき抑制
              }}
            />
          )}
          
          {/* 追従オーバーレイ（モバイルPointer用） */}
          {isTouchDragging && dragOverlayPos && draggedItemIndex != null && (
            <div
              aria-hidden
              className="fixed z-[9999] pointer-events-none rounded-lg shadow-lg overflow-hidden"
              style={{
                left: dragOverlayPos.x,
                top: dragOverlayPos.y,
                width: dragOverlayPos.width,
                height: dragOverlayPos.height,
                transform: 'translateZ(0)', // レイヤ昇格で滑らかに
              }}
            >
              {/* 中身はカードの見た目を簡易に再現 */}
              {imageItems[draggedItemIndex]?.previewUrl || imageItems[draggedItemIndex]?.url ? (
                <img
                  src={imageItems[draggedItemIndex]!.previewUrl || imageItems[draggedItemIndex]!.url!}
                  alt=""
                  className="w-full h-full object-cover opacity-90"
                />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
            </div>
          )}
        </div>
      )}

      {/* 画像追加後の小さい追加ボタン */}
      {canAddMore && imageItems.length > 0 && (
        <div className="flex justify-center">
          <button
            className={`
              inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm 
              transition-colors hover:bg-muted/50 hover:border-primary/50
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            onClick={() => {
                if (!disabled && fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
              }
            }}
            disabled={disabled}
          >
            <Upload size={16} />
            追加
          </button>
          
          {/* 追加ボタン専用の隠しinput */}
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

      {/* 制限メッセージ */}
      {imageItems.length >= maxImages && (
        <p className="text-sm text-muted-foreground text-center">
          最大{maxImages}枚まで選択されています
        </p>
      )}
    </div>
  );
};