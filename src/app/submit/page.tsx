"use client";

import { useUrlValidation, getValidationStyle, getValidationIcon } from "@/hooks/useUrlValidation";
import { useSubmitForm } from "@/hooks/useSubmitForm";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Check, X, AlertCircle } from "lucide-react";
import { TagInput } from "@/components/ui/TagInput";
import { AutoTagButton } from "@/components/AutoTagButton";
import { CATEGORIES, findCategoryByValue } from "@/lib/constants/categories";



export default function SubmitPage() {
  const { user } = useAuth();
  const {
    formData,
    customCategory,
    errors,
    isSubmitting,
    submitSuccess,
    handleInputChange,
    setCustomCategory,
    isButtonDisabled,
    handleSubmit,
  } = useSubmitForm();
  
  const urlValidation = useUrlValidation(formData.url || "");

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
            {/* ① 基本情報（必須） */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-foreground border-b border-border pb-2">① 基本情報（必須）</h2>
              
              {/* URL */}
              <div>
                <label htmlFor="submit-url" className="block text-base font-medium text-foreground mb-2">
                  Gemini共有リンク <span className="text-error">*</span>
                  <span className="text-sm font-normal text-muted-foreground ml-2">：共有URLを貼り付け</span>
                </label>
              <div className="relative">
                <input
                  id="submit-url"
                  name="url"
                  type="url"
                  value={formData.url || ""}
                  onChange={(e) => handleInputChange("url", e.target.value)}
                  placeholder="https://gemini.google.com/share/xxxxx"
                  className={`w-full px-3 py-2 pr-10 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground transition-colors ${getValidationStyle(urlValidation.status).borderColor}`}
                />
                
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {getValidationIcon(urlValidation.status) === 'loading' && (
                    <Loader2 className={`h-5 w-5 animate-spin ${getValidationStyle(urlValidation.status).iconColor}`} />
                  )}
                  {getValidationIcon(urlValidation.status) === 'check' && (
                    <Check className={`h-5 w-5 ${getValidationStyle(urlValidation.status).iconColor}`} />
                  )}
                  {getValidationIcon(urlValidation.status) === 'x' && (
                    <X className={`h-5 w-5 ${getValidationStyle(urlValidation.status).iconColor}`} />
                  )}
                </div>
              </div>
              
              {urlValidation.message && (
                <div className={`mt-2 p-2 rounded text-sm flex items-center gap-2 ${getValidationStyle(urlValidation.status).bgColor}`}>
                  {urlValidation.status === 'valid' && <Check className="h-4 w-4 text-success flex-shrink-0" />}
                  {(urlValidation.status === 'invalid_format' || urlValidation.status === 'not_found' || 
                    urlValidation.status === 'not_accessible' || urlValidation.status === 'timeout' || 
                    urlValidation.status === 'server_error' || urlValidation.status === 'rate_limited') && (
                    <AlertCircle className="h-4 w-4 text-error flex-shrink-0" />
                  )}
                  {urlValidation.status === 'validating' && <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />}
                  <span className={
                    urlValidation.status === 'valid' ? 'text-success' :
                    urlValidation.status === 'validating' ? 'text-primary' :
                    'text-error'
                  }>
                    {urlValidation.message}
                  </span>
                  {urlValidation.status === 'timeout' && (
                    <button 
                      type="button"
                      onClick={urlValidation.retry}
                      className="text-primary hover:text-primary/80 text-xs underline ml-auto"
                    >
                      再試行
                    </button>
                  )}
                </div>
              )}
              
              {urlValidation.ogpData?.title && (
                <div className="mt-2 p-3 bg-success/5 border border-success/20 rounded text-sm">
                  <p className="font-medium text-success">✅ 有効なCanvasが見つかりました</p>
                  {urlValidation.ogpData.title && (
                    <p className="text-muted-foreground mt-1">
                      <strong>タイトル:</strong> {urlValidation.ogpData.title}
                    </p>
                  )}
                  {urlValidation.ogpData.description && (
                    <p className="text-muted-foreground mt-1 line-clamp-2">
                      <strong>説明:</strong> {urlValidation.ogpData.description}
                    </p>
                  )}
                </div>
              )}
              
              {errors.url && <p className="text-error text-sm mt-1">{errors.url}</p>}
            </div>

            {/* 作品タイトル */}
            <div>
              <label htmlFor="submit-title" className="block text-base font-medium text-foreground mb-2">
                作品タイトル <span className="text-error">*</span>
              </label>
              <input
                id="submit-title"
                name="title"
                type="text"
                value={formData.title || ""}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="12文字以下推奨"
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
              {errors.title && <p className="text-error text-sm mt-1">{errors.title}</p>}
            </div>

            {/* サムネイル画像 */}
            <div>
              <label htmlFor="submit-thumbnail-url" className="block text-base font-medium text-foreground mb-2">
                サムネイル画像 <span className="text-error">*</span>
                <span className="text-sm font-normal text-muted-foreground ml-2">：必須／5:3に切り抜きされる</span>
              </label>
              <textarea
                id="submit-thumbnail-url"
                name="thumbnailUrl"
                value={formData.thumbnailUrl || ""}
                onChange={(e) => {
                  handleInputChange("thumbnailUrl", e.target.value);
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '42px';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                  }
                }}
                placeholder="https://example.com/image.jpg"
                rows={1}
                style={{ minHeight: '42px', resize: 'none', overflow: 'hidden' }}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
              {errors.thumbnailUrl && <p className="text-error text-sm mt-1">{errors.thumbnailUrl}</p>}
            </div>

            {/* カテゴリー */}
            <div>
              <label htmlFor="submit-category" className="block text-base font-medium text-foreground mb-2">
                カテゴリ <span className="text-error">*</span>
              </label>
              <select
                id="submit-category"
                name="category"
                value={formData.category || ""}
                onChange={(e) => handleInputChange("category", e.target.value)}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              >
                <option value="">カテゴリを選択</option>
                {CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              {formData.category && (
                <p className="text-sm text-muted-foreground mt-1">
                  {findCategoryByValue(formData.category || "")?.description}
                </p>
              )}
              {errors.category && <p className="text-error text-sm mt-1">{errors.category}</p>}

              {formData.category === "その他" && (
                <div className="mt-3">
                  <label htmlFor="submit-custom-category" className="block text-base font-medium text-foreground mb-2">
                    追加希望カテゴリ
                  </label>
                  <textarea
                    id="submit-custom-category"
                    name="customCategory"
                    value={customCategory}
                    onChange={(e) => {
                      setCustomCategory(e.target.value);
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = '42px';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="新しいカテゴリ名を入力"
                    rows={1}
                    style={{ minHeight: '42px', resize: 'none', overflow: 'hidden' }}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    運営に送信され、追加が検討されます。
                  </p>
                </div>
              )}
            </div>

            {/* タグ */}
            <div>
              <label className="block text-base font-medium text-foreground mb-2">
                タグ <span className="text-error">*</span>
                <span className="text-sm font-normal text-muted-foreground ml-2">：作品の特徴や用途を表すタグの追加を推奨します（最大5個、各20文字以内）</span>
              </label>
              
              <TagInput
                tags={formData.tags || []}
                onTagsChange={(tags) => handleInputChange("tags", tags)}
                maxTags={5}
              />
              
              <div className="mt-2">
                <AutoTagButton
                  title={formData.title || ""}
                  description={formData.description || ""}
                  currentTags={formData.tags || []}
                  onTagsGenerated={(tags) => handleInputChange("tags", tags)}
                  maxTags={5}
                />
              </div>
              
              {errors.tags && <p className="text-error text-sm mt-1">{errors.tags}</p>}
            </div>

            {/* 作品概要 */}
            <div>
              <label htmlFor="submit-description" className="block text-base font-medium text-foreground mb-2">
                作品概要 <span className="text-error">*</span>
              </label>
              <textarea
                id="submit-description"
                name="description"
                value={formData.description || ""}
                onChange={(e) => {
                  handleInputChange("description", e.target.value);
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '96px';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                  }
                }}
                placeholder=""
                rows={4}
                style={{ minHeight: '96px', resize: 'none', overflow: 'hidden' }}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
              {errors.description && <p className="text-error text-sm mt-1">{errors.description}</p>}
            </div>
            </div>

            {/* ② コンセプト詳細 */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-foreground border-b border-border pb-2">② コンセプト詳細</h2>

            {/* 課題・背景 */}
            <div>
              <label htmlFor="submit-challenge" className="block text-base font-medium text-foreground mb-2">
                課題・背景
                <span className="text-sm font-normal text-muted-foreground ml-2">：何を解決したかったか、どうして作ろうと思ったか</span>
              </label>
              <textarea
                id="submit-challenge"
                name="challenge"
                value={formData.challenge || ""}
                onChange={(e) => {
                  handleInputChange("challenge", e.target.value);
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '72px';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                  }
                }}
                placeholder=""
                rows={3}
                style={{ minHeight: '72px', resize: 'none', overflow: 'hidden' }}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
              {errors.challenge && <p className="text-error text-sm mt-1">{errors.challenge}</p>}
            </div>

            {/* 想定シーン・利用者 */}
            <div>
              <label htmlFor="submit-use-case" className="block text-base font-medium text-foreground mb-2">
                想定シーン・利用者
                <span className="text-sm font-normal text-muted-foreground ml-2">：誰がどんな場面で使うと便利か</span>
              </label>
              <textarea
                id="submit-use-case"
                name="useCase"
                value={formData.useCase || ""}
                onChange={(e) => {
                  handleInputChange("useCase", e.target.value);
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '72px';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                  }
                }}
                placeholder=""
                rows={3}
                style={{ minHeight: '72px', resize: 'none', overflow: 'hidden' }}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
              {errors.useCase && <p className="text-error text-sm mt-1">{errors.useCase}</p>}
            </div>

            {/* 差別化ポイント */}
            <div>
              <label htmlFor="submit-differentiator" className="block text-base font-medium text-foreground mb-2">
                差別化ポイント
                <span className="text-sm font-normal text-muted-foreground ml-2">：他と違う工夫・独自性（UI/UX、使い方の発想、組み合わせ方など）</span>
              </label>
              <textarea
                id="submit-differentiator"
                name="differentiator"
                value={formData.differentiator || ""}
                onChange={(e) => {
                  handleInputChange("differentiator", e.target.value);
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '72px';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                  }
                }}
                placeholder=""
                rows={3}
                style={{ minHeight: '72px', resize: 'none', overflow: 'hidden' }}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
              {errors.differentiator && <p className="text-error text-sm mt-1">{errors.differentiator}</p>}
            </div>

            {/* 応用・発展アイデア */}
            <div>
              <label htmlFor="submit-future-ideas" className="block text-base font-medium text-foreground mb-2">
                応用・発展アイデア
                <span className="text-sm font-normal text-muted-foreground ml-2">：今後の改良案や応用の方向性</span>
              </label>
              <textarea
                id="submit-future-ideas"
                name="futureIdeas"
                value={formData.futureIdeas || ""}
                onChange={(e) => {
                  handleInputChange("futureIdeas", e.target.value);
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '72px';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                  }
                }}
                placeholder=""
                rows={3}
                style={{ minHeight: '72px', resize: 'none', overflow: 'hidden' }}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
              {errors.futureIdeas && <p className="text-error text-sm mt-1">{errors.futureIdeas}</p>}
            </div>
            </div>

            {/* 運営取材の受け入れ */}
            <div>
              <label className="block text-base font-medium text-foreground mb-2">
                運営取材
              </label>
              <div className="space-y-2">
                <label htmlFor="submit-accept-interview" className="flex items-center">
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
                {submitSuccess ? "✅ 投稿完了！リダイレクト中..." :
                 isSubmitting ? "投稿中..." : 
                 urlValidation.isValidating ? "🔍 URLを確認中..." :
                 formData.url && formData.url.trim() && urlValidation.isValid === false ? "❌ 有効なURLを入力してください" :
                 "投稿する"}
              </button>
              
              {urlValidation.isValid === false && formData.url && formData.url.trim() && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  有効なGeminiの共有リンクを入力すると投稿できます
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}