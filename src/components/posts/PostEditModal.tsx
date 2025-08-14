'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit3, Check, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUrlValidation, getValidationStyle } from '@/hooks/useUrlValidation';
import { ThumbnailUploader } from '@/components/ui/ThumbnailUploader';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { TagInput } from '@/components/ui/TagInput';
import { Field } from '@/components/Field';
import { AutosizeTextarea } from '@/components/AutosizeTextarea';
import { ValidationStatus } from '@/components/ValidationStatus';
import { CATEGORY_MASTERS, findCategoryById } from '@/lib/constants/categories';
import { cx } from '@/lib/cx';
import type { Post } from '@/types/Post';

interface PostEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onUpdate?: () => void;
}

interface PostEditFormData {
  title: string;
  description: string;
  url: string;
  categoryId: string;
  customCategory?: string;
  problemBackground?: string;
  useCase?: string;
  uniquePoints?: string;
  futureIdeas?: string;
  tagIds: string[];
  thumbnail: string;
  prImages: string[];
  acceptInterview: boolean;
  customSections: Array<{
    id: string;
    title: string;
    content: string;
  }>;
}

export function PostEditModal({ isOpen, onClose, post, onUpdate }: PostEditModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<PostEditFormData>({
    title: '',
    description: '',
    url: '',
    categoryId: '',
    customCategory: '',
    problemBackground: '',
    useCase: '',
    uniquePoints: '',
    futureIdeas: '',
    tagIds: [],
    thumbnail: '',
    prImages: [],
    acceptInterview: false,
    customSections: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // URL検証
  const urlValidation = useUrlValidation(formData.url || "");

  // 説明文セクション管理
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [customSections, setCustomSections] = useState<{id: string, title: string}[]>([]);
  const [customSectionData, setCustomSectionData] = useState<{[key: string]: string}>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');


  // セクション管理関数
  const toggleSection = (section: string) => {
    setSelectedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const addCustomSection = () => {
    if (newSectionTitle.trim()) {
      const newSection = {
        id: `custom_${Date.now()}`,
        title: newSectionTitle.trim()
      };
      setCustomSections(prev => [...prev, newSection]);
      setNewSectionTitle('');
      setShowAddForm(false);
    }
  };

  const removeCustomSection = (sectionId: string) => {
    setCustomSections(prev => prev.filter(section => section.id !== sectionId));
    setSelectedSections(prev => {
      const newSet = new Set(prev);
      newSet.delete(sectionId);
      return newSet;
    });
    setCustomSectionData(prev => {
      const newData = { ...prev };
      delete newData[sectionId];
      return newData;
    });
  };

  const handleCustomSectionChange = (sectionId: string, value: string) => {
    setCustomSectionData(prev => ({
      ...prev,
      [sectionId]: value
    }));
  };

  // モーダルが開かれたときにフォームをリセット
  useEffect(() => {
    if (isOpen && post) {
      setFormData({
        title: post.title,
        description: post.description,
        url: post.url,
        categoryId: post.categoryId,
        customCategory: post.customCategory || '',
        problemBackground: post.problemBackground || '',
        useCase: post.useCase || '',
        uniquePoints: post.uniquePoints || '',
        futureIdeas: post.futureIdeas || '',
        tagIds: post.tagIds || [],
        thumbnail: post.thumbnail || '',
        prImages: post.prImages || [],
        acceptInterview: post.acceptInterview || false,
        customSections: post.customSections || [],
      });

      // 既存のセクションを選択状態にする
      const sections = new Set<string>();
      if (post.problemBackground) sections.add('problemBackground');
      if (post.useCase) sections.add('useCase');
      if (post.uniquePoints) sections.add('uniquePoints');
      if (post.futureIdeas) sections.add('futureIdeas');
      
      setSelectedSections(sections);

      // カスタムセクションの設定
      if (post.customSections) {
        const customSecs = post.customSections.map(section => ({
          id: section.id,
          title: section.title
        }));
        setCustomSections(customSecs);
        
        const customData: {[key: string]: string} = {};
        post.customSections.forEach(section => {
          customData[section.id] = section.content;
          sections.add(section.id);
        });
        setCustomSectionData(customData);
        setSelectedSections(sections);
      }

      setError('');
    }
  }, [isOpen, post]);

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

  const handleInputChange = (field: keyof PostEditFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !post) return;

    // バリデーション
    const { validatePostFormBasic } = await import('@/lib/utils/postValidation');
    const validation = validatePostFormBasic(formData);
    if (!validation.isValid) {
      setError(validation.error!);
      return;
    }

    // URL検証
    if (formData.url && formData.url.trim()) {
      if (urlValidation.isValidating) {
        setError('URLの確認中です。しばらくお待ちください。');
        return;
      }
      
      if (urlValidation.isValid !== true) {
        const errorMessage = urlValidation.message || 
          '有効なGemini共有リンクまたはChatGPT Canvas共有リンクを入力してください。';
        setError(errorMessage);
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 画像のアップロード処理（blob URLをFirebase Storage URLに変換）
      const { uploadThumbnailIfNeeded, uploadPrImagesIfNeeded } = await import('@/lib/utils/imageUploadHelpers');
      
      const finalThumbnail = await uploadThumbnailIfNeeded(formData.thumbnail, user.uid);
      const finalPrImages = await uploadPrImagesIfNeeded(formData.prImages, user.uid);

      // 選択されたセクションのみのデータを準備
      const finalFormData = { ...formData };
      
      // 選択されていないセクション、または選択されていても内容が空のセクションのデータを除外
      if (!selectedSections.has('problemBackground') || !finalFormData.problemBackground?.trim()) {
        delete finalFormData.problemBackground;
      }
      if (!selectedSections.has('useCase') || !finalFormData.useCase?.trim()) {
        delete finalFormData.useCase;
      }
      if (!selectedSections.has('uniquePoints') || !finalFormData.uniquePoints?.trim()) {
        delete finalFormData.uniquePoints;
      }
      if (!selectedSections.has('futureIdeas') || !finalFormData.futureIdeas?.trim()) {
        delete finalFormData.futureIdeas;
      }

      // カスタムセクションデータを処理（選択されたもののみ）
      const { processCustomSections } = await import('@/lib/utils/customSectionHelpers');
      const filteredCustomSections = customSections.filter(section => selectedSections.has(section.id));
      const finalCustomSections = processCustomSections(filteredCustomSections, customSectionData) || [];

      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          ...finalFormData,
          thumbnail: finalThumbnail,
          prImages: finalPrImages,
          customSections: finalCustomSections,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '作品の更新に失敗しました');
      }

      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Post update error:', error);
      setError(error instanceof Error ? error.message : '作品の更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !post) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="max-w-4xl w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Edit3 size={20} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">作品を編集</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* コンテンツ */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* ① 基本情報 */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-foreground border-b border-border pb-2">① 基本情報</h2>
            
            {/* URL */}
            <Field
              id="edit-url"
              label="共有リンク"
              required
              help="Gemini共有リンクまたはChatGPT Canvas共有リンクを貼り付け"
            >
              <div className="relative">
                <input
                  id="edit-url"
                  name="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => handleInputChange("url", e.target.value)}
                  placeholder="https://gemini.google.com/share/xxxxx または https://chatgpt.com/canvas/shared/xxxxx"
                  className={cx(
                    "w-full px-3 py-2 pr-10 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground transition-colors",
                    getValidationStyle(urlValidation.status).borderColor
                  )}
                />
                <ValidationStatus
                  status={urlValidation.status}
                  message={urlValidation.message}
                  onRetry={urlValidation.retry}
                  ogpData={urlValidation.ogpData}
                />
              </div>
              {urlValidation.isValid === false && formData.url && formData.url.trim() && (
                <p className="text-sm text-red-600 mt-1">{urlValidation.message}</p>
              )}
            </Field>

            {/* 作品タイトル */}
            <Field
              id="edit-title"
              label="作品タイトル"
              required
            >
              <div className="w-full bg-input border border-black rounded-md focus-within:ring-2 focus-within:ring-ring">
                <input
                  id="edit-title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="12文字以下推奨"
                  className="w-full px-3 py-2 bg-transparent border-none outline-none text-input-foreground"
                />
              </div>
            </Field>

            {/* サムネイル画像 */}
            <div>
              <label className="block text-base font-medium text-foreground mb-2">
                サムネイル画像
                <span className="text-error"> *</span>
                <span className="text-sm font-normal text-muted-foreground ml-2">：5:3に自動で切り抜かれます</span>
              </label>
              <ThumbnailUploader
                image={formData.thumbnail}
                onImageChange={(image) => handleInputChange("thumbnail", image)}
                disabled={isSubmitting}
              />
            </div>

            {/* PR画像 */}
            <div>
              <label className="block text-base font-medium text-foreground mb-2">
                PR画像
                <span className="text-sm font-normal text-muted-foreground ml-2">：ドラッグで並べ替え／最大6枚</span>
              </label>
              <ImageUploader
                images={formData.prImages}
                onImagesChange={(images) => handleInputChange("prImages", images)}
                maxImages={6}
                disabled={isSubmitting}
                mode="pr"
              />
            </div>

            {/* カテゴリー */}
            <Field
              id="edit-category"
              label="カテゴリ"
              required
            >
              <select
                id="edit-category"
                name="categoryId"
                value={formData.categoryId}
                onChange={(e) => handleInputChange("categoryId", e.target.value)}
                className="w-full px-3 py-2 bg-input border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              >
                <option value="">カテゴリを選択</option>
                {CATEGORY_MASTERS.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {formData.categoryId && (
                <p className="text-sm text-muted-foreground mt-1">
                  {findCategoryById(formData.categoryId)?.description}
                </p>
              )}
            </Field>

            {/* タグ */}
            <div>
              <label className="block text-base font-medium text-foreground mb-2">
                タグ
                <span className="text-error"> *</span>
                <span className="text-sm font-normal text-muted-foreground ml-2">：作品の特徴や用途を表すタグの追加を推奨します（最大5個、各20文字以内）</span>
              </label>
              <div>
                <TagInput
                  tags={formData.tagIds}
                  onTagsChange={(tags) => handleInputChange("tagIds", tags)}
                  maxTags={5}
                />
              </div>
            </div>
          </div>

          {/* ② 説明文 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground border-b border-border pb-2">② 説明文</h2>
            
            {/* 作品概要 */}
            <Field
              id="edit-description"
              label="作品概要"
              required
            >
              <div className="w-full bg-input border border-black rounded-md focus-within:ring-2 focus-within:ring-ring">
                <AutosizeTextarea
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder=""
                  rows={4}
                  minHeight="96px"
                  className="w-full px-3 py-2 bg-transparent border-none outline-none text-input-foreground"
                />
              </div>
            </Field>

            <p className="text-sm text-muted-foreground">
              作品をより詳しく紹介したい項目があれば、下記から選択してください。
            </p>

            {/* 選択ボタン群 */}
            <div className="flex flex-wrap gap-3">
              {/* 固定の4つのボタン */}
              <button
                type="button"
                onClick={() => toggleSection('problemBackground')}
                className={`px-4 py-2 border rounded-md transition-colors font-medium ${
                  selectedSections.has('problemBackground')
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 border-border hover:bg-muted/50 text-foreground'
                }`}
              >
                課題・背景
              </button>
              <button
                type="button"
                onClick={() => toggleSection('useCase')}
                className={`px-4 py-2 border rounded-md transition-colors font-medium ${
                  selectedSections.has('useCase')
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 border-border hover:bg-muted/50 text-foreground'
                }`}
              >
                想定シーン・利用者
              </button>
              <button
                type="button"
                onClick={() => toggleSection('uniquePoints')}
                className={`px-4 py-2 border rounded-md transition-colors font-medium ${
                  selectedSections.has('uniquePoints')
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 border-border hover:bg-muted/50 text-foreground'
                }`}
              >
                差別化ポイント
              </button>
              <button
                type="button"
                onClick={() => toggleSection('futureIdeas')}
                className={`px-4 py-2 border rounded-md transition-colors font-medium ${
                  selectedSections.has('futureIdeas')
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 border-border hover:bg-muted/50 text-foreground'
                }`}
              >
                応用・発展アイデア
              </button>

              {/* カスタムセクションのボタン */}
              {customSections.map((section) => (
                <div key={section.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className={`px-4 py-2 border rounded-md transition-colors font-medium ${
                      selectedSections.has(section.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 border-border hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    {section.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCustomSection(section.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="削除"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* 追加ボタン */}
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 border border-dashed border-border rounded-md hover:bg-muted/50 transition-colors font-medium text-muted-foreground hover:text-foreground flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                項目を追加
              </button>
            </div>

            {/* カスタムセクション追加フォーム */}
            {showAddForm && (
              <div className="mt-4 p-4 border border-border rounded-md bg-muted/20">
                <h4 className="font-medium text-foreground mb-3">新しい項目を追加</h4>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="new-section-title" className="block text-sm font-medium text-foreground mb-1">
                      項目名 <span className="text-error">*</span>
                    </label>
                    <input
                      id="new-section-title"
                      type="text"
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      placeholder="例：技術的課題、使用技術、開発期間など"
                      className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSectionTitle.trim()) {
                          addCustomSection();
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addCustomSection}
                      disabled={!newSectionTitle.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      追加
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewSectionTitle('');
                      }}
                      className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 選択された項目の入力フォーム */}
            {selectedSections.size > 0 && (
              <div className="space-y-6 mt-6">
                {selectedSections.has('problemBackground') && (
                  <Field
                    id="edit-problem-background"
                    label="課題・背景"
                    help="何を解決したかったか、どうして作ろうと思ったか"
                  >
                    <div className="w-full bg-input border border-black rounded-md focus-within:ring-2 focus-within:ring-ring">
                      <AutosizeTextarea
                        id="edit-problem-background"
                        name="problemBackground"
                        value={formData.problemBackground || ""}
                        onChange={(e) => handleInputChange("problemBackground", e.target.value)}
                        placeholder="どのような課題を解決したかったか、作ろうと思ったきっかけなどを記入してください"
                        rows={3}
                        minHeight="72px"
                        className="w-full px-3 py-2 bg-transparent border-none outline-none text-input-foreground"
                      />
                    </div>
                  </Field>
                )}

                {selectedSections.has('useCase') && (
                  <Field
                    id="edit-use-case"
                    label="想定シーン・利用者"
                    help="誰がどんな場面で使うと便利か"
                  >
                    <div className="w-full bg-input border border-black rounded-md focus-within:ring-2 focus-within:ring-ring">
                      <AutosizeTextarea
                        id="edit-use-case"
                        name="useCase"
                        value={formData.useCase || ""}
                        onChange={(e) => handleInputChange("useCase", e.target.value)}
                        placeholder="どのような人がどんな場面で使うと便利かを記入してください"
                        rows={3}
                        minHeight="72px"
                        className="w-full px-3 py-2 bg-transparent border-none outline-none text-input-foreground"
                      />
                    </div>
                  </Field>
                )}

                {selectedSections.has('uniquePoints') && (
                  <Field
                    id="edit-unique-points"
                    label="差別化ポイント"
                    help="他と違う工夫・独自性（UI/UX、使い方の発想、組み合わせ方など）"
                  >
                    <div className="w-full bg-input border border-black rounded-md focus-within:ring-2 focus-within:ring-ring">
                      <AutosizeTextarea
                        id="edit-unique-points"
                        name="uniquePoints"
                        value={formData.uniquePoints || ""}
                        onChange={(e) => handleInputChange("uniquePoints", e.target.value)}
                        placeholder="他の作品と異なる工夫や独自性について記入してください"
                        rows={3}
                        minHeight="72px"
                        className="w-full px-3 py-2 bg-transparent border-none outline-none text-input-foreground"
                      />
                    </div>
                  </Field>
                )}

                {selectedSections.has('futureIdeas') && (
                  <Field
                    id="edit-future-ideas"
                    label="応用・発展アイデア"
                    help="今後の改良案や応用の方向性"
                  >
                    <div className="w-full bg-input border border-black rounded-md focus-within:ring-2 focus-within:ring-ring">
                      <AutosizeTextarea
                        id="edit-future-ideas"
                        name="futureIdeas"
                        value={formData.futureIdeas || ""}
                        onChange={(e) => handleInputChange("futureIdeas", e.target.value)}
                        placeholder="今後の改良案や応用の方向性について記入してください"
                        rows={3}
                        minHeight="72px"
                        className="w-full px-3 py-2 bg-transparent border-none outline-none text-input-foreground"
                      />
                    </div>
                  </Field>
                )}

                {/* カスタムセクションのフォーム */}
                {customSections.map((section) => (
                  selectedSections.has(section.id) && (
                    <Field
                      key={section.id}
                      id={`edit-custom-${section.id}`}
                      label={section.title}
                    >
                      <div className="w-full bg-input border border-black rounded-md focus-within:ring-2 focus-within:ring-ring">
                        <AutosizeTextarea
                          id={`edit-custom-${section.id}`}
                          name={`custom-${section.id}`}
                          value={customSectionData[section.id] || ""}
                          onChange={(e) => handleCustomSectionChange(section.id, e.target.value)}
                          placeholder={`${section.title}について記入してください`}
                          rows={3}
                          minHeight="72px"
                          className="w-full px-3 py-2 bg-transparent border-none outline-none text-input-foreground"
                        />
                      </div>
                    </Field>
                  )
                ))}
              </div>
            )}
          </div>

          {/* 運営取材の受け入れ */}
          <div>
            <div className="space-y-2">
              <label htmlFor="edit-accept-interview" className="flex items-center text-base font-medium text-foreground mb-2">
                <input
                  id="edit-accept-interview"
                  type="checkbox"
                  name="acceptInterview"
                  checked={formData.acceptInterview}
                  onChange={(e) => handleInputChange("acceptInterview", e.target.checked)}
                  className="mr-2"
                />
                運営からの取材を受け入れる
              </label>
              <p className="text-sm text-muted-foreground ml-6">
                プロフィールに連絡可能なSNSが記載されている方に対して、運営から作品に対して取材のご連絡をさせていただく場合があります
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ボタン */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting || 
                urlValidation.isValidating || 
                !formData.title.trim() || 
                !formData.description.trim() || 
                !formData.url.trim() ||
                (formData.url && formData.url.trim() && urlValidation.isValid === false)
              }
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>更新中...</span>
                </>
              ) : urlValidation.isValidating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>🔍 URLを確認中...</span>
                </>
              ) : formData.url && formData.url.trim() && urlValidation.isValid === false ? (
                <>
                  <X size={16} />
                  <span>❌ 有効なURLを入力してください</span>
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

  // Portal を使用してbodyに直接レンダリング
  return typeof window !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
}