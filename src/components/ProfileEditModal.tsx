'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { User, Upload, Check, X, Edit3, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { updateUserProfile, updateUserProfileDirect } from '@/lib/userProfile';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ImageUploader } from '@/components/ui/ImageUploader';
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
  const [profileImages, setProfileImages] = useState<string[]>([]);
  
  // Debug: Track profileImages state changes
  useEffect(() => {
    console.log('ProfileEditModal - profileImages state changed:', profileImages);
  }, [profileImages]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // モーダルが開かれたときにフォームをリセット
  useEffect(() => {
    console.log('ProfileEditModal - Modal useEffect triggered:', { isOpen, userProfile });
    if (isOpen && userProfile) {
      setFormData({
        publicId: userProfile.publicId,
        username: userProfile.username,
      });
      // 既存のプロフィール画像があれば表示
      const initialImages = userProfile.photoURL ? [userProfile.photoURL] : [];
      console.log('ProfileEditModal - Modal opened, setting initial images:', initialImages);
      setProfileImages(initialImages);
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
      console.log('ProfileEditModal - Before update:');
      console.log('- profileImages:', profileImages);
      console.log('- profileImages.length:', profileImages.length);
      console.log('- userProfile.photoURL:', userProfile.photoURL);
      
      // 新しい画像パイプライン用のユーザープロフィール更新
      // profileImagesから新しい画像URLを取得
      const updateData = {
        ...formData,
        photoURL: profileImages.length > 0 ? profileImages[0] : userProfile.photoURL
      };
      
      console.log('ProfileEditModal - updating with:', updateData);
      
      // 直接Firestoreを更新（新しいパイプライン対応）
      await updateUserProfileDirect(userProfile.uid, updateData);
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
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl shadow-xl transform transition-all duration-200 scale-100 opacity-100">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Edit3 size={20} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">プロフィール編集</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* コンテンツ */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* プロフィール画像 */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              プロフィール画像
            </label>
            <ImageUploader
              images={profileImages}
              onImagesChange={(urls) => {
                console.log('ProfileEditModal - onImagesChange callback received URLs:', urls);
                setProfileImages(urls);
              }}
              maxImages={1}
              disabled={isSubmitting}
              mode="avatar"
            />
            <p className="text-xs text-gray-500">
              正方形（1:1）に自動調整されます
            </p>
          </div>

          {/* 公開ID */}
          <div className="space-y-2">
            <label htmlFor="edit-publicId" className="block text-sm font-medium text-gray-700">
              公開ID <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-publicId"
              name="editPublicId"
              type="text"
              value={formData.publicId}
              onChange={(e) => setFormData(prev => ({ ...prev, publicId: e.target.value }))}
              placeholder="英数字6-10文字"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={10}
              pattern="[a-zA-Z0-9]+"
              required
            />
            <p className="text-xs text-gray-500">
              {formData.publicId.length}/10文字 (英数字のみ、あなたを識別するユニークなID)
            </p>
          </div>

          {/* ユーザー名 */}
          <div className="space-y-2">
            <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700">
              ユーザー名 <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-username"
              name="editUsername"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="表示するユーザー名を入力"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={10}
              required
            />
            <p className="text-xs text-gray-500">
              {formData.username.length}/10文字 (日本語可、公開表示名)
            </p>
          </div>


          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ボタン */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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