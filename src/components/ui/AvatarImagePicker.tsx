'use client';

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X, User, Edit2 } from 'lucide-react';
import { ImageCropper } from './ImageCropper';
import { validateImageFile } from '@/lib/utils/imageUtils';
import Image from 'next/image';

interface AvatarImagePickerProps {
  currentImageUrl?: string;
  onImageSelected: (file: File) => void;
  onImageRemoved?: () => void;
  disabled?: boolean;
  onImageSelectionStart?: () => void;
}

export function AvatarImagePicker({
  currentImageUrl,
  onImageSelected,
  onImageRemoved,
  disabled = false,
  onImageSelectionStart
}: AvatarImagePickerProps) {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイル選択処理
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('AvatarImagePicker - File select event triggered');
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.target.files?.[0];
    if (!file) {
      console.log('AvatarImagePicker - No file selected');
      return;
    }

    console.log('AvatarImagePicker - File selected:', file.name);

    // ファイルバリデーション
    if (!validateImageFile(file)) {
      alert('有効な画像ファイル（JPEG, PNG, WebP）を選択してください。');
      return;
    }

    // ファイルサイズチェック（10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('ファイルサイズは10MB以下にしてください。');
      return;
    }

    console.log('AvatarImagePicker - File validation passed, creating preview URL');
    
    // プレビューURL作成
    const url = URL.createObjectURL(file);
    setSelectedImageUrl(url);
    setShowCropper(true);

    console.log('AvatarImagePicker - Cropper should be showing now');

    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // クロップ完了処理
  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    console.log('AvatarImagePicker - Crop completed');
    
    // 古いURLをクリーンアップ
    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl);
    }
    if (croppedImageUrl) {
      URL.revokeObjectURL(croppedImageUrl);
    }

    // 新しいFileオブジェクトを作成
    const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
    setCroppedFile(file);

    // プレビューURL作成
    const url = URL.createObjectURL(croppedBlob);
    setCroppedImageUrl(url);

    // 親コンポーネントに通知
    onImageSelected(file);

    // クロッパーを閉じる
    setShowCropper(false);
    setSelectedImageUrl(null);
  }, [selectedImageUrl, croppedImageUrl, onImageSelected]);

  // クロップキャンセル処理
  const handleCropCancel = useCallback(() => {
    console.log('AvatarImagePicker - Crop cancelled');
    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl);
    }
    setSelectedImageUrl(null);
    setShowCropper(false);
  }, [selectedImageUrl]);

  // 画像削除処理
  const handleRemoveImage = useCallback(() => {
    if (croppedImageUrl) {
      URL.revokeObjectURL(croppedImageUrl);
    }
    setCroppedImageUrl(null);
    setCroppedFile(null);
    if (onImageRemoved) {
      onImageRemoved();
    }
  }, [croppedImageUrl, onImageRemoved]);

  // 再選択処理
  const handleReselect = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation(); // イベントバブリングを停止
    onImageSelectionStart?.(); // 画像選択開始を親に通知
    fileInputRef.current?.click();
  }, [onImageSelectionStart]);

  // 表示する画像URL（優先順位: クロップ済み > 現在の画像）
  const displayImageUrl = croppedImageUrl || currentImageUrl;

  return (
    <div className="space-y-4">
      {/* 画像表示エリア */}
      <div className="flex justify-center">
        <div className="relative">
          {displayImageUrl ? (
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 group">
              <Image
                src={displayImageUrl}
                alt="Profile"
                fill
                className="object-cover"
              />
              {!disabled && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReselect(e);
                    }}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                    title="変更"
                  >
                    <Edit2 size={16} className="text-gray-700" />
                  </button>
                  {croppedImageUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                      className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                      title="削除"
                    >
                      <X size={16} className="text-gray-700" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onImageSelectionStart?.();
                fileInputRef.current?.click();
              }}
              disabled={disabled}
              className={`w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-gray-400 transition-colors ${
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              <User size={32} className="text-gray-400 mb-1" />
              <span className="text-xs text-gray-500">画像を選択</span>
            </button>
          )}
        </div>
      </div>

      {/* 選択ボタン（画像がない場合） */}
      {!displayImageUrl && (
        <div className="flex justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onImageSelectionStart?.();
              fileInputRef.current?.click();
            }}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={16} />
            画像を選択
          </button>
        </div>
      )}

      {/* 状態表示 */}
      {croppedFile && (
        <p className="text-center text-sm text-green-600">
          ✓ 新しい画像が選択されました
        </p>
      )}

      {/* 非表示のファイル入力 - Portal経由でbodyに直接配置 */}
      {typeof window !== 'undefined' && createPortal(
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={disabled}
          style={{ 
            position: 'fixed', 
            left: '-9999px', 
            top: '-9999px',
            pointerEvents: 'none',
            visibility: 'hidden'
          }}
          tabIndex={-1}
        />,
        document.body
      )}

      {/* クロッパーモーダル */}
      {showCropper && selectedImageUrl && (
        <ImageCropper
          imageUrl={selectedImageUrl}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1}
          minWidth={100}
          minHeight={100}
        />
      )}
    </div>
  );
}