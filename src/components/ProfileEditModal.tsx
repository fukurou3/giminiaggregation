'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { User, Upload, Check, X, Edit3, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { updateUserProfile } from '@/lib/userProfile';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { UserProfileForm } from '@/types/User';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { userProfile, refreshProfile } = useUserProfile();
  const [formData, setFormData] = useState<UserProfileForm>({
    publicId: userProfile?.publicId || '',
    username: userProfile?.username || '',
  });
  const [previewImage, setPreviewImage] = useState<string>(userProfile?.photoURL || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // モーダルが開かれたときにフォームをリセット
  useEffect(() => {
    if (isOpen && userProfile) {
      setFormData({
        publicId: userProfile.publicId,
        username: userProfile.username,
      });
      setPreviewImage(userProfile.photoURL || '');
      setError('');
    }
  }, [isOpen, userProfile]);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください');
      return;
    }

    setIsCompressing(true);
    setError('');

    try {
      // 画像圧縮オプション
      const options = {
        maxSizeMB: 1, // 最大1MB
        maxWidthOrHeight: 800, // 最大800px
        useWebWorker: true,
        fileType: 'image/webp', // WebP形式に変換
      };

      // 画像を圧縮
      const compressedFile = await imageCompression(file, options);
      
      // 圧縮後のファイルサイズをチェック（念のため）
      if (compressedFile.size > 2 * 1024 * 1024) {
        setError('圧縮後のファイルサイズが大きすぎます');
        return;
      }

      setFormData(prev => ({ ...prev, photoFile: compressedFile }));
      
      // プレビュー画像を作成
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(compressedFile);

    } catch (error) {
      console.error('Image compression error:', error);
      setError('画像の圧縮に失敗しました。別の画像を試してください。');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile) return;
    
    // 公開IDの入力チェック
    if (!formData.publicId.trim()) {
      setError('公開IDを入力してください');
      return;
    }

    if (formData.publicId.length < 6 || formData.publicId.length > 10) {
      setError('公開IDは6-10文字で入力してください');
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(formData.publicId)) {
      setError('公開IDは英数字のみ使用できます');
      return;
    }

    // ユーザー名の入力チェック
    if (!formData.username.trim()) {
      setError('ユーザー名を入力してください');
      return;
    }

    if (formData.username.length > 10) {
      setError('ユーザー名は10文字以内で入力してください');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await updateUserProfile(userProfile.uid, formData);
      await refreshProfile();
      onClose();
    } catch (error) {
      console.error('Profile update error:', error);
      setError('プロフィールの更新に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !userProfile) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="max-w-md w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl transform transition-all duration-200 scale-100 opacity-100">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Edit3 size={20} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">プロフィール編集</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* プロフィール画像 */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              {previewImage ? (
                <Image
                  src={previewImage}
                  alt="プレビュー"
                  width={96}
                  height={96}
                  className="rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  <User size={32} className="text-gray-400 dark:text-gray-500" />
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompressing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>圧縮中...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>画像を変更</span>
                </>
              )}
            </button>
            
            <input
              ref={fileInputRef}
              id="edit-profile-image-upload"
              name="editProfileImage"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {isCompressing ? '画像を圧縮しています...' : 'JPG, PNG形式（自動圧縮されます）'}
            </p>
          </div>

          {/* 公開ID */}
          <div className="space-y-2">
            <label htmlFor="edit-publicId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              公開ID <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-publicId"
              name="editPublicId"
              type="text"
              value={formData.publicId}
              onChange={(e) => setFormData(prev => ({ ...prev, publicId: e.target.value }))}
              placeholder="英数字6-10文字"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={10}
              pattern="[a-zA-Z0-9]+"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formData.publicId.length}/10文字 (英数字のみ、あなたを識別するユニークなID)
            </p>
          </div>

          {/* ユーザー名 */}
          <div className="space-y-2">
            <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              ユーザー名 <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-username"
              name="editUsername"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="表示するユーザー名を入力"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={10}
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formData.username.length}/10文字 (日本語可、公開表示名)
            </p>
          </div>


          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* ボタン */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.publicId.trim() || !formData.username.trim()}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>更新中...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>更新</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}