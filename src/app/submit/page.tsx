"use client";

import { useUrlValidation, getValidationStyle } from "@/hooks/useUrlValidation";
import { useSubmitForm } from "@/hooks/useSubmitForm";
import { useAuth } from "@/hooks/useAuth";
import { TagInput } from "@/components/ui/TagInput";
import { AutoTagButton } from "@/components/AutoTagButton";
import { CATEGORIES, findCategoryByValue } from "@/lib/constants/categories";
import { Field } from "@/components/Field";
import { AutosizeTextarea } from "@/components/AutosizeTextarea";
import { ValidationStatus } from "@/components/ValidationStatus";
import { cx } from "@/lib/cx";



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
  
  // Extract complex conditional logic to constants  
  const submitButtonText = submitSuccess ? "✅ 投稿完了！リダイレクト中..." :
    isSubmitting ? "投稿中..." : 
    urlValidation.isValidating ? "🔍 URLを確認中..." :
    formData.url && formData.url.trim() && urlValidation.isValid === false ? "❌ 有効なURLを入力してください" :
    "投稿する";
  
  const showUrlValidationHelp = urlValidation.isValid === false && formData.url && formData.url.trim();

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
              <input
                id="submit-title"
                name="title"
                type="text"
                value={formData.title || ""}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="12文字以下推奨"
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
            </Field>

            {/* サムネイル画像 */}
            <Field
              id="submit-thumbnail-url"
              label="サムネイル画像"
              required
              help="必須／5:3に切り抜きされる"
              error={errors.thumbnailUrl}
            >
              <AutosizeTextarea
                id="submit-thumbnail-url"
                name="thumbnailUrl"
                value={formData.thumbnailUrl || ""}
                onChange={(e) => handleInputChange("thumbnailUrl", e.target.value)}
                placeholder="https://example.com/image.jpg"
                rows={1}
                minHeight="42px"
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
            </Field>

            {/* 作品概要 */}
            <Field
              id="submit-description"
              label="作品概要"
              required
              error={errors.description}
            >
              <AutosizeTextarea
                id="submit-description"
                name="description"
                value={formData.description || ""}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder=""
                rows={4}
                minHeight="96px"
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
            </Field>

            {/* カテゴリー */}
            <Field
              id="submit-category"
              label="カテゴリ"
              required
              error={errors.category}
            >
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

              {formData.category === "その他" && (
                <div className="mt-3">
                  <Field
                    id="submit-custom-category"
                    label="追加希望カテゴリ"
                  >
                    <AutosizeTextarea
                      id="submit-custom-category"
                      name="customCategory"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="新しいカテゴリ名を入力"
                      rows={1}
                      minHeight="42px"
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
                    />
                  </Field>
                  <p className="text-sm text-muted-foreground mt-1">
                    運営に送信され、追加が検討されます。
                  </p>
                </div>
              )}
            </Field>

            {/* タグ */}
            <Field
              id="tags-section"
              label="タグ"
              required
              help="作品の特徴や用途を表すタグの追加を推奨します（最大5個、各20文字以内）"
              error={errors.tags}
            >
              <div>
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
              </div>
            </Field>
            </div>

            {/* ② コンセプト詳細 */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-foreground border-b border-border pb-2">② コンセプト詳細</h2>

            {/* 課題・背景 */}
            <Field
              id="submit-problem-background"
              label="課題・背景"
              help="何を解決したかったか、どうして作ろうと思ったか"
              error={errors.problemBackground}
            >
              <AutosizeTextarea
                id="submit-problem-background"
                name="problemBackground"
                value={formData.problemBackground || ""}
                onChange={(e) => handleInputChange("problemBackground", e.target.value)}
                placeholder=""
                rows={3}
                minHeight="72px"
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
            </Field>

            {/* 想定シーン・利用者 */}
            <Field
              id="submit-use-case"
              label="想定シーン・利用者"
              help="誰がどんな場面で使うと便利か"
              error={errors.useCase}
            >
              <AutosizeTextarea
                id="submit-use-case"
                name="useCase"
                value={formData.useCase || ""}
                onChange={(e) => handleInputChange("useCase", e.target.value)}
                placeholder=""
                rows={3}
                minHeight="72px"
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
            </Field>

            {/* 差別化ポイント */}
            <Field
              id="submit-unique-points"
              label="差別化ポイント"
              help="他と違う工夫・独自性（UI/UX、使い方の発想、組み合わせ方など）"
              error={errors.uniquePoints}
            >
              <AutosizeTextarea
                id="submit-unique-points"
                name="uniquePoints"
                value={formData.uniquePoints || ""}
                onChange={(e) => handleInputChange("uniquePoints", e.target.value)}
                placeholder=""
                rows={3}
                minHeight="72px"
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
            </Field>

            {/* 応用・発展アイデア */}
            <Field
              id="submit-future-ideas"
              label="応用・発展アイデア"
              help="今後の改良案や応用の方向性"
              error={errors.futureIdeas}
            >
              <AutosizeTextarea
                id="submit-future-ideas"
                name="futureIdeas"
                value={formData.futureIdeas || ""}
                onChange={(e) => handleInputChange("futureIdeas", e.target.value)}
                placeholder=""
                rows={3}
                minHeight="72px"
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
              />
            </Field>
            </div>

            {/* 運営取材の受け入れ */}
            <Field
              id="submit-accept-interview"
              label="運営取材"
            >
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
            </Field>

            {/* 投稿ボタン */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isButtonDisabled(urlValidation)}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {submitButtonText}
              </button>
              
              {showUrlValidationHelp && (
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