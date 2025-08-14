"use client";

import { useState, useEffect } from "react";
import { useUrlValidation, getValidationStyle } from "@/hooks/useUrlValidation";
import { useSubmitForm } from "@/hooks/useSubmitForm";
import { useAuth } from "@/hooks/useAuth";
import { TagInput } from "@/components/ui/TagInput";
import { AutoTagButton } from "@/components/AutoTagButton";
import { FloatingCoachButton } from "@/components/FloatingCoachButton";
import { CATEGORY_MASTERS, findCategoryById } from "@/lib/constants/categories";
import { Field } from "@/components/Field";
import { AutosizeTextarea } from "@/components/AutosizeTextarea";
import { ValidationStatus } from "@/components/ValidationStatus";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { ThumbnailUploader } from "@/components/ui/ThumbnailUploader";
import { cx } from "@/lib/cx";
import { Plus, X } from "lucide-react";



interface CoachAdvice {
  refinedOverview: string;
  headlineIdeas: string[];
  goodPoints: string[];
}

interface CoachResponse {
  version: string;
  timestamp: string;
  advice: CoachAdvice;
  questionnaire: Array<{
    field: "problem" | "background" | "scenes" | "users" | "differentiation" | "extensions";
    question: string;
  }>;
}

export default function SubmitPage() {
  const { user } = useAuth();
  const [coachAdvice, setCoachAdvice] = useState<CoachResponse | null>(null);
  const [showCoachPrompt, setShowCoachPrompt] = useState(false);
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);
  const [hasShownCoachPrompt, setHasShownCoachPrompt] = useState(false);
  
  // コンセプト詳細の選択状態管理（複数選択対応）
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  
  // カスタムセクション管理
  const [customSections, setCustomSections] = useState<{id: string, title: string}[]>([]);
  const [customSectionData, setCustomSectionData] = useState<{[key: string]: string}>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

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
  
  const {
    formData,
    errors,
    isSubmitting,
    submitSuccess,
    handleInputChange,
    isButtonDisabled,
    handleSubmit,
  } = useSubmitForm();
  
  const urlValidation = useUrlValidation(formData.url || "");
  
  // AIアドバイスプロンプト表示の条件管理
  useEffect(() => {
    const hasBasicInfo = formData.title?.trim() && formData.categoryId?.trim() && formData.description?.trim();
    const hasMinimumDescription = formData.description?.trim().length >= 50;
    const hasNotUsedCoach = !coachAdvice;
    const isNotTyping = !isDescriptionFocused;
    const hasNotShownBefore = !hasShownCoachPrompt;
    
    if (hasBasicInfo && hasMinimumDescription && hasNotUsedCoach && isNotTyping && hasNotShownBefore) {
      setShowCoachPrompt(true);
      setHasShownCoachPrompt(true);
    } else if (!hasBasicInfo || !hasMinimumDescription || !hasNotUsedCoach || !hasNotShownBefore) {
      setShowCoachPrompt(false);
    }
  }, [formData.title, formData.categoryId, formData.description, coachAdvice, isDescriptionFocused, hasShownCoachPrompt]);
  
  // Extract complex conditional logic to constants  
  const submitButtonText = submitSuccess ? "✅ 投稿完了！リダイレクト中..." :
    isSubmitting ? "投稿中..." : 
    urlValidation.isValidating ? "🔍 URLを確認中..." :
    formData.url && formData.url.trim() && urlValidation.isValid === false ? "❌ 有効なURLを入力してください" :
    "投稿する";
  
  const showUrlValidationHelp = urlValidation.isValid === false && formData.url && formData.url.trim();

  // 必須項目チェック用の関数
  const getRequiredFieldsMessage = () => {
    if (isSubmitting || submitSuccess || urlValidation.isValidating) {
      return null;
    }
    
    const missingFields = [];
    
    if (!formData.title?.trim()) missingFields.push('作品タイトル');
    if (!formData.url?.trim()) missingFields.push('Gemini共有リンク');
    if (!formData.description?.trim()) missingFields.push('作品概要');
    if (!formData.categoryId?.trim()) missingFields.push('カテゴリ');
    if (!formData.tagIds?.length) missingFields.push('タグ');
    if (!formData.thumbnail?.trim()) missingFields.push('サムネイル画像');
    
    if (formData.url?.trim() && urlValidation.isValid === false) {
      return '❌ 有効なGemini共有リンクを入力してください';
    }
    
    if (missingFields.length > 0) {
      return `⚠️ 以下の必須項目を入力してください: ${missingFields.join('、')}`;
    }
    
    return null;
  };
  
  const requiredFieldsMessage = getRequiredFieldsMessage();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">ログインが必要です</h2>
          <p className="text-muted-foreground">作品を投稿するにはログインしてください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-background border border-border rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-foreground mb-6">作品を投稿</h1>
          
          <form onSubmit={(e) => handleSubmit(e, urlValidation)} className="space-y-8">
            {/* ① 基本情報 */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-foreground border-b border-border pb-2">① 基本情報</h2>
              
              {/* URL */}
              <Field
                id="submit-url"
                label="Gemini共有リンク"
                required
                help="共有URLを貼り付け"
                error={errors.url}
              >
                <div className="relative">
                  <input
                    id="submit-url"
                    name="url"
                    type="url"
                    value={formData.url || ""}
                    onChange={(e) => handleInputChange("url", e.target.value)}
                    placeholder="https://gemini.google.com/share/xxxxx"
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
                    showInputIcon
                  />
                </div>
              </Field>

            {/* 作品タイトル */}
            <Field
              id="submit-title"
              label="作品タイトル"
              required
              error={errors.title}
            >
              <div className="w-full bg-input border border-black rounded-md focus-within:ring-2 focus-within:ring-ring">
                <input
                  id="submit-title"
                  name="title"
                  type="text"
                  value={formData.title || ""}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="12文字以下推奨"
                  className="w-full px-3 py-2 bg-transparent border-none outline-none text-input-foreground"
                />
                
                {/* AIアドバイス: タイトル案 */}
                {coachAdvice && coachAdvice.advice.headlineIdeas.length > 0 && (
                  <div className="px-3 py-2">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-xs font-medium text-red-600">💡 AIからのタイトル案</p>
                      <button
                        type="button"
                        onClick={() => {
                          setCoachAdvice({
                            ...coachAdvice,
                            advice: {
                              ...coachAdvice.advice,
                              headlineIdeas: []
                            }
                          });
                        }}
                        className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2 text-sm"
                        title="すべて削除"
                      >
                        ×
                      </button>
                    </div>
                    <ul className="space-y-0.5">
                      {coachAdvice.advice.headlineIdeas.map((idea, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-gray-600 text-xs">•</span>
                          <span className="flex-1 text-xs">{idea}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
                image={formData.thumbnail || ''}
                onImageChange={(image) => handleInputChange("thumbnail", image)}
                disabled={isSubmitting}
              />
              {errors.thumbnail && (
                <p className="text-error text-sm mt-1">
                  {errors.thumbnail}
                </p>
              )}
            </div>

            {/* PR画像 */}
            <div>
              <label className="block text-base font-medium text-foreground mb-2">
                PR画像
                <span className="text-sm font-normal text-muted-foreground ml-2">：ドラッグで並べ替え／最大6枚</span>
              </label>
              <ImageUploader
                images={formData.prImages || []}
                onImagesChange={(images) => handleInputChange("prImages", images)}
                maxImages={6}
                disabled={isSubmitting}
                mode="pr"
              />
              {errors.prImages && (
                <p className="text-error text-sm mt-1">
                  {errors.prImages}
                </p>
              )}
            </div>

            {/* カテゴリー */}
            <Field
              id="submit-category"
              label="カテゴリ"
              required
              error={errors.categoryId}
            >
              <select
                id="submit-category"
                name="categoryId"
                value={formData.categoryId || ""}
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
                  {findCategoryById(formData.categoryId || "")?.description}
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
                  tags={formData.tagIds || []}
                  onTagsChange={(tags) => handleInputChange("tagIds", tags)}
                  maxTags={5}
                />
                
                <div className="mt-2">
                  <AutoTagButton
                    title={formData.title || ""}
                    description={formData.description || ""}
                    currentTags={formData.tagIds || []}
                    onTagsGenerated={(tags) => handleInputChange("tagIds", tags)}
                    maxTags={5}
                  />
                </div>
              </div>
              {errors.tagIds && (
                <p className="text-error text-sm mt-1">
                  {errors.tagIds}
                </p>
              )}
            </div>

            </div>

            {/* ② コンセプト詳細 */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground border-b border-border pb-2">② 説明文</h2>
              
              {/* 作品概要 */}
              <Field
                id="submit-description"
                label="作品概要"
                required
                error={errors.description}
              >
                <div className="w-full bg-input border border-black rounded-md focus-within:ring-2 focus-within:ring-ring">
                  <AutosizeTextarea
                    id="submit-description"
                    name="description"
                    value={formData.description || ""}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    onFocus={() => setIsDescriptionFocused(true)}
                    onBlur={() => setIsDescriptionFocused(false)}
                    placeholder=""
                    rows={4}
                    minHeight="96px"
                    className="w-full px-3 py-2 bg-transparent border-none outline-none text-input-foreground"
                  />
                  
                  {/* AIアドバイス: 概要文提案 */}
                  {coachAdvice && coachAdvice.advice.refinedOverview && (
                    <div className="px-3 py-2">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-medium text-red-600">💡 AIからの概要文提案</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCoachAdvice({
                              ...coachAdvice,
                              advice: {
                                ...coachAdvice.advice,
                                refinedOverview: ""
                              }
                            });
                          }}
                          className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2 text-sm"
                          title="削除"
                        >
                          ×
                        </button>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{coachAdvice.advice.refinedOverview}</p>
                    </div>
                  )}

                  {/* AIアドバイス: Goodポイント */}
                  {coachAdvice && coachAdvice.advice.goodPoints && coachAdvice.advice.goodPoints.length > 0 && (
                    <div className="px-3 py-2">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-medium text-red-600">💡 Goodポイント</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCoachAdvice({
                              ...coachAdvice,
                              advice: {
                                ...coachAdvice.advice,
                                goodPoints: []
                              }
                            });
                          }}
                          className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2 text-sm"
                          title="削除"
                        >
                          ×
                        </button>
                      </div>
                      <ul className="space-y-0.5">
                        {coachAdvice.advice.goodPoints.map((point, index) => (
                          <li key={index} className="flex items-start gap-1">
                            <span className="text-gray-600 text-xs">•</span>
                            <span className="flex-1 text-xs">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Field>

              <p className="text-sm text-muted-foreground">
                作品をより詳しく紹介したい項目があれば、下記から選択してください。
              </p>

              {/* 選択ボタン群（常に表示、選択されたボタンは状態表示） */}
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

              {/* 選択された項目の入力フォーム（複数表示対応） */}
              {selectedSections.size > 0 && (
                <div className="space-y-6 mt-6">
                  {selectedSections.has('problemBackground') && (
                    <Field
                      id="submit-problem-background"
                      label="課題・背景"
                      help="何を解決したかったか、どうして作ろうと思ったか"
                      error={errors.problemBackground}
                    >
                      <div className="w-full bg-input border border-black rounded-md focus-within:ring-2 focus-within:ring-ring">
                        <AutosizeTextarea
                          id="submit-problem-background"
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
                      id="submit-use-case"
                      label="想定シーン・利用者"
                      help="誰がどんな場面で使うと便利か"
                      error={errors.useCase}
                    >
                      <div className="w-full bg-input border border-black rounded-md focus-within:ring-2 focus-within:ring-ring">
                        <AutosizeTextarea
                          id="submit-use-case"
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
                      id="submit-unique-points"
                      label="差別化ポイント"
                      help="他と違う工夫・独自性（UI/UX、使い方の発想、組み合わせ方など）"
                      error={errors.uniquePoints}
                    >
                      <div className="w-full bg-input border border-black rounded-md focus-within:ring-2 focus-within:ring-ring">
                        <AutosizeTextarea
                          id="submit-unique-points"
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
                      id="submit-future-ideas"
                      label="応用・発展アイデア"
                      help="今後の改良案や応用の方向性"
                      error={errors.futureIdeas}
                    >
                      <div className="w-full bg-input border border-black rounded-md focus-within:ring-2 focus-within:ring-ring">
                        <AutosizeTextarea
                          id="submit-future-ideas"
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
                        id={`submit-custom-${section.id}`}
                        label={section.title}
                      >
                        <div className="w-full bg-input border border-black rounded-md focus-within:ring-2 focus-within:ring-ring">
                          <AutosizeTextarea
                            id={`submit-custom-${section.id}`}
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

            {/* AIからの質問（統一表示エリア） */}
            {coachAdvice && coachAdvice.questionnaire && coachAdvice.questionnaire.length > 0 && (
              <div className="bg-background border border-border rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">❓ AIからの質問</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setCoachAdvice({
                        ...coachAdvice,
                        questionnaire: []
                      });
                    }}
                    className="text-red-500 hover:text-red-700 text-sm"
                    title="すべて削除"
                  >
                    すべて削除
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  作品をより魅力的に伝えるためのAIからの質問です。回答は任意ですが、答えることで作品の価値がより明確になります。
                </p>
                <div className="space-y-3">
                  {coachAdvice.questionnaire.map((q, index) => (
                    <div key={index} className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                            質問 {index + 1}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {q.field === 'problem' ? '課題' :
                             q.field === 'background' ? '背景' :
                             q.field === 'scenes' ? '想定シーン' :
                             q.field === 'users' ? '利用者' :
                             q.field === 'differentiation' ? '差別化' :
                             q.field === 'extensions' ? '応用' : q.field}
                          </span>
                        </div>
                        <div className="font-medium text-foreground">{q.question}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedQuestionnaire = coachAdvice.questionnaire.filter((_, i) => i !== index);
                          setCoachAdvice({
                            ...coachAdvice,
                            questionnaire: updatedQuestionnaire
                          });
                        }}
                        className="text-red-500 hover:text-red-700 text-sm ml-3"
                        title="この質問を削除"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 運営取材の受け入れ */}
            <div>
              <div className="space-y-2">
                <label htmlFor="submit-accept-interview" className="flex items-center text-base font-medium text-foreground mb-2">
                  <input
                    id="submit-accept-interview"
                    type="checkbox"
                    name="acceptInterview"
                    checked={formData.acceptInterview || false}
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

            {/* 投稿ボタン */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isButtonDisabled(urlValidation)}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {submitButtonText}
              </button>
              
              {/* 必須項目に関するメッセージ */}
              {requiredFieldsMessage && (
                <p className="text-sm text-foreground mt-3 text-center">
                  {requiredFieldsMessage}
                </p>
              )}
              
              {showUrlValidationHelp && !requiredFieldsMessage && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  有効なGeminiの共有リンクを入力すると投稿できます
                </p>
              )}
            </div>
          </form>
        </div>
        
        {/* 画面右下固定のAIアドバイスボタン */}
        <FloatingCoachButton
          title={formData.title || ""}
          categoryId={formData.categoryId || ""}
          tagIds={formData.tagIds || []}
          overview={formData.description || ""}
          optional={{
            problem: formData.problemBackground,
            background: formData.problemBackground,
            scenes: formData.useCase,
            users: formData.useCase,
            differentiation: formData.uniquePoints,
            extensions: formData.futureIdeas,
          }}
          appUrl={formData.url}
          onAdviceGenerated={setCoachAdvice}
        />
        
        {/* AIアドバイス促進オーバーレイ */}
        {showCoachPrompt && (
          <div className="fixed inset-0 z-40 pointer-events-none">
            {/* 薄暗いオーバーレイ（右下のボタン以外） */}
            <div 
              className="absolute inset-0 bg-black/30 pointer-events-auto"
              onClick={() => setShowCoachPrompt(false)}
            />
            
            {/* プロンプトメッセージ */}
            <div className="absolute bottom-32 right-6 bg-white rounded-lg shadow-lg p-4 max-w-sm pointer-events-auto border-2 border-blue-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm">🤖</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">AIアドバイスを試してみませんか？</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    作品の魅力をより効果的に伝えるアドバイスを生成できます。
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCoachPrompt(false)}
                      className="text-xs px-3 py-1 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      後で
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowCoachPrompt(false)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ×
                </button>
              </div>
              
              {/* 矢印 */}
              <div className="absolute bottom-[-8px] right-8 w-4 h-4 bg-white border-r-2 border-b-2 border-blue-200 transform rotate-45"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}