"use client";

import { useUrlValidation, getValidationStyle, getValidationIcon } from "@/hooks/useUrlValidation";
import { useSubmitForm } from "@/hooks/useSubmitForm";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Check, X, AlertCircle } from "lucide-react";
import { TagInput } from "@/components/ui/TagInput";
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
          
          <form onSubmit={(e) => handleSubmit(e, urlValidation)} className="space-y-6">
            {/* URL */}
            <div>
              <label htmlFor="submit-url" className="block text-sm font-medium text-foreground mb-2">
                Gemini共有リンク <span className="text-error">*</span>
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

            {/* タイトル */}
            <div>
              <label htmlFor="submit-title" className="block text-sm font-medium text-foreground mb-2">
                タイトル <span className="text-error">*</span>
              </label>
              <input
                id="submit-title"
                name="title"
                type="text"
                value={formData.title || ""}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="サイト名・作品名"
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
              {errors.title && <p className="text-error text-sm mt-1">{errors.title}</p>}
            </div>

            {/* 説明 */}
            <div>
              <label htmlFor="submit-description" className="block text-sm font-medium text-foreground mb-2">
                説明 <span className="text-error">*</span>
              </label>
              <textarea
                id="submit-description"
                name="description"
                value={formData.description || ""}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="作品の内容や使い方、特徴など"
                rows={4}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
              {errors.description && <p className="text-error text-sm mt-1">{errors.description}</p>}
            </div>

            {/* タグ */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                タグ（任意）
              </label>
              <TagInput
                tags={formData.tags || []}
                onTagsChange={(tags) => handleInputChange("tags", tags)}
                maxTags={5}
                placeholder="タグを入力してEnterキーで追加（例: 便利ツール、生産性向上）"
              />
              {errors.tags && <p className="text-error text-sm mt-1">{errors.tags}</p>}
              <p className="text-sm text-muted-foreground mt-1">
                作品の特徴や用途を表すタグを追加できます（最大5個、各20文字以内）
              </p>
            </div>

            {/* カテゴリー */}
            <div>
              <label htmlFor="submit-category" className="block text-sm font-medium text-foreground mb-2">
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
                  <label htmlFor="submit-custom-category" className="block text-sm font-medium text-foreground mb-2">
                    追加希望カテゴリ
                  </label>
                  <input
                    id="submit-custom-category"
                    name="customCategory"
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="新しいカテゴリ名を入力"
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    運営に送信され、追加が検討されます。
                  </p>
                </div>
              )}
            </div>

            {/* サムネイル画像URL */}
            <div>
              <label htmlFor="submit-thumbnail-url" className="block text-sm font-medium text-foreground mb-2">
                サムネイル画像URL（任意）
              </label>
              <input
                id="submit-thumbnail-url"
                name="thumbnailUrl"
                type="url"
                value={formData.thumbnailUrl || ""}
                onChange={(e) => handleInputChange("thumbnailUrl", e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
              {errors.thumbnailUrl && <p className="text-error text-sm mt-1">{errors.thumbnailUrl}</p>}
            </div>

            {/* 公開設定 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                公開設定
              </label>
              <div className="space-y-2">
                <label htmlFor="submit-is-public-true" className="flex items-center">
                  <input
                    id="submit-is-public-true"
                    type="radio"
                    name="isPublic"
                    checked={formData.isPublic === true}
                    onChange={() => handleInputChange("isPublic", true)}
                    className="mr-2"
                  />
                  公開
                </label>
                <label htmlFor="submit-is-public-false" className="flex items-center">
                  <input
                    id="submit-is-public-false"
                    type="radio"
                    name="isPublic"
                    checked={formData.isPublic === false}
                    onChange={() => handleInputChange("isPublic", false)}
                    className="mr-2"
                  />
                  非公開
                </label>
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
                 isSubmitting ? "📤 投稿中..." : 
                 urlValidation.isValidating ? "🔍 URLを確認中..." :
                 formData.url && formData.url.trim() && urlValidation.isValid === false ? "❌ 有効なURLを入力してください" :
                 "🚀 投稿する"}
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