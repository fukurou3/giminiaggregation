'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { User, Upload, Check, Loader2, RefreshCw } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { setupUserProfile, generateUniquePublicId } from '@/lib/userProfile';
import type { UserProfileForm } from '@/types/User';

interface ProfileSetupProps {
  uid: string;
  onComplete: () => void;
}

export function ProfileSetup({ uid, onComplete }: ProfileSetupProps) {
  const [formData, setFormData] = useState<UserProfileForm>({
    publicId: '',
    username: '',
  });
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 公開IDを自動生成
  const generatePublicId = async () => {
    setIsGeneratingId(true);
    try {
      const newPublicId = await generateUniquePublicId();
      setFormData(prev => ({ ...prev, publicId: newPublicId }));
      setError('');
    } catch (error) {
      console.error('Error generating publicId:', error);
      setError('公開IDの生成に失敗しました');
    } finally {
      setIsGeneratingId(false);
    }
  };

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
      await setupUserProfile(uid, formData);
      onComplete();
    } catch (error: unknown) {
      console.error('Profile setup error:', error);
      setError(error instanceof Error ? error.message : 'プロフィールの設定に失敗しました。もう一度お試しください。');
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
            公開ID（英数字6-10文字）とユーザー名（10文字まで）を設定してください
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

          {/* 公開ID */}
          <div className="space-y-2">
            <label htmlFor="setup-publicId" className="block text-sm font-medium text-foreground">
              公開ID <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-2">
              <input
                id="setup-publicId"
                name="setupPublicId"
                type="text"
                value={formData.publicId}
                onChange={(e) => setFormData(prev => ({ ...prev, publicId: e.target.value }))}
                placeholder="英数字6-10文字"
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                maxLength={10}
                pattern="[a-zA-Z0-9]+"
                required
              />
              <button
                type="button"
                onClick={generatePublicId}
                disabled={isGeneratingId}
                className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="ランダム生成"
              >
                {isGeneratingId ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.publicId.length}/10文字 (英数字のみ、あなたを識別するユニークなID)
            </p>
          </div>

          {/* ユーザー名 */}
          <div className="space-y-2">
            <label htmlFor="setup-username" className="block text-sm font-medium text-foreground">
              ユーザー名 <span className="text-red-500">*</span>
            </label>
            <input
              id="setup-username"
              name="setupUsername"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="表示するユーザー名を入力"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              maxLength={10}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.username.length}/10文字 (日本語可、公開表示名)
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !formData.publicId.trim() || !formData.username.trim()}
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