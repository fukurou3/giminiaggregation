'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { User, Upload, Check, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { updateUserProfile } from '@/lib/userProfile';
import type { UserProfileForm } from '@/types/User';

interface ProfileSetupProps {
  uid: string;
  email: string;
  onComplete: () => void;
}

export function ProfileSetup({ uid, email, onComplete }: ProfileSetupProps) {
  const [formData, setFormData] = useState<UserProfileForm>({
    displayName: '',
  });
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    if (!formData.displayName.trim()) {
      setError('ユーザー名を入力してください');
      return;
    }

    if (formData.displayName.length > 50) {
      setError('ユーザー名は50文字以内で入力してください');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await updateUserProfile(uid, formData);
      onComplete();
    } catch (error) {
      console.error('Profile setup error:', error);
      setError('プロフィールの設定に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-3">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-5 shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            プロフィール設定
          </h1>
          <p className="text-muted-foreground">
            安全のため、表示名とアイコンを設定してください
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                <div className="w-24 h-24 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                  <User size={32} className="text-muted-foreground" />
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
              className="flex items-center space-x-2 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompressing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>圧縮中...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>画像をアップロード</span>
                </>
              )}
            </button>
            
            <input
              ref={fileInputRef}
              id="setup-profile-image-upload"
              name="setupProfileImage"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            
            <p className="text-xs text-muted-foreground text-center">
              {isCompressing ? '画像を圧縮しています...' : 'JPG, PNG形式（自動圧縮されます）'}
            </p>
          </div>

          {/* ユーザー名 */}
          <div className="space-y-2">
            <label htmlFor="setup-displayName" className="block text-sm font-medium text-foreground">
              ユーザー名 <span className="text-red-500">*</span>
            </label>
            <input
              id="setup-displayName"
              name="setupDisplayName"
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="表示するユーザー名を入力"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              maxLength={50}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.displayName.length}/50文字
            </p>
          </div>

          {/* メールアドレス表示 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              メールアドレス
            </label>
            <input
              id="setup-userEmail"
              name="setupUserEmail"
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !formData.displayName.trim()}
            className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>設定中...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>プロフィールを設定</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}