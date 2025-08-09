"use client";

import { useState } from "react";
import { useUrlValidation, getValidationStyle } from "@/hooks/useUrlValidation";
import { useSubmitForm } from "@/hooks/useSubmitForm";
import { useAuth } from "@/hooks/useAuth";
import { TagInput } from "@/components/ui/TagInput";
import { AutoTagButton } from "@/components/AutoTagButton";
import { FloatingCoachButton } from "@/components/FloatingCoachButton";
import { CATEGORIES, findCategoryByValue } from "@/lib/constants/categories";
import { Field } from "@/components/Field";
import { AutosizeTextarea } from "@/components/AutosizeTextarea";
import { ValidationStatus } from "@/components/ValidationStatus";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { cx } from "@/lib/cx";



interface CoachAdvice {
  refinedOverview: string;
  storeBlurb140: string;
  headlineIdeas: string[];
  valueBullets: string[];
}

interface CoachResponse {
  version: string;
  timestamp: string;
  advice: CoachAdvice;
  questionnaire: Array<{
    field: "problem" | "background" | "scenes" | "users" | "differentiation" | "extensions";
    question: string;
    why: string;
  }>;
}

export default function SubmitPage() {
  const { user } = useAuth();
  const [coachAdvice, setCoachAdvice] = useState<CoachResponse | null>(null);
  
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
                
                {/* AIアドバイス: ヘッドライン案 */}
                {coachAdvice && coachAdvice.advice.headlineIdeas.length > 0 && (
                  <div className="px-3 py-2">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-xs font-medium text-red-600">💡 AIからのヘッドライン案</p>
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

            {/* 画像 */}
            <div>
              <label className="block text-base font-medium text-foreground mb-2">
                画像
                <span className="text-error"> *</span>
                <span className="text-sm font-normal text-muted-foreground ml-2">：必須／5:3に切り抜きされる／最大5枚</span>
              </label>
              <ImageUploader
                images={formData.images || []}
                onImagesChange={(images) => handleInputChange("images", images)}
                maxImages={5}
                disabled={isSubmitting}
              />
              {errors.images && (
                <p className="text-error text-sm mt-1">
                  {errors.images}
                </p>
              )}
            </div>

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
                  placeholder=""
                  rows={4}
                  minHeight="96px"
                  className="w-full px-3 py-2 bg-transparent border-none outline-none text-input-foreground"
                />
                
                {/* AIアドバイス: 推奨概要文 */}
                {coachAdvice && coachAdvice.advice.refinedOverview && (
                  <div className="px-3 py-2">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-xs font-medium text-red-600">💡 AIからの推奨概要文</p>
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
                    <p className="text-xs">{coachAdvice.advice.refinedOverview}</p>
                  </div>
                )}

                {/* AIアドバイス: 一覧向け紹介文 */}
                {coachAdvice && coachAdvice.advice.storeBlurb140 && (
                  <div className="px-3 py-2">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-xs font-medium text-red-600">💡 AIからの一覧向け紹介文（140文字）</p>
                      <button
                        type="button"
                        onClick={() => {
                          setCoachAdvice({
                            ...coachAdvice,
                            advice: {
                              ...coachAdvice.advice,
                              storeBlurb140: ""
                            }
                          });
                        }}
                        className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2 text-sm"
                        title="削除"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-xs">{coachAdvice.advice.storeBlurb140}</p>
                  </div>
                )}

                {/* AIアドバイス: 便益ポイント */}
                {coachAdvice && coachAdvice.advice.valueBullets.length > 0 && (
                  <div className="px-3 py-2">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-xs font-medium text-red-600">💡 AIからの便益ポイント</p>
                      <button
                        type="button"
                        onClick={() => {
                          setCoachAdvice({
                            ...coachAdvice,
                            advice: {
                              ...coachAdvice.advice,
                              valueBullets: []
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
                      {coachAdvice.advice.valueBullets.map((bullet, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-gray-600 text-xs">•</span>
                          <span className="flex-1 text-xs">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
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
                className="w-full px-3 py-2 bg-input border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
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
                      className="w-full px-3 py-2 bg-input border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
                    />
                  </Field>
                  <p className="text-sm text-muted-foreground mt-1">
                    運営に送信され、追加が検討されます。
                  </p>
                </div>
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
              {errors.tags && (
                <p className="text-error text-sm mt-1">
                  {errors.tags}
                </p>
              )}
            </div>
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
              <div className="w-full bg-input border border-black rounded-md focus-within:ring-2 focus-within:ring-ring">
                <AutosizeTextarea
                  id="submit-problem-background"
                  name="problemBackground"
                  value={formData.problemBackground || ""}
                  onChange={(e) => handleInputChange("problemBackground", e.target.value)}
                  placeholder=""
                  rows={3}
                  minHeight="72px"
                  className="w-full px-3 py-2 bg-transparent border-none outline-none text-input-foreground"
                />
              
                
                {/* AIアドバイス: 課題・背景に関する質問 */}
                {coachAdvice && coachAdvice.questionnaire
                  .filter(q => q.field === "problem" || q.field === "background")
                  .map((q, index) => (
                    <div key={index} className="px-3 py-2">
                      <div className="flex items-start justify-between mb-1">
                        <div className="font-medium text-red-600 text-xs">❓ AIからの質問</div>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedQuestionnaire = coachAdvice.questionnaire.filter((_, i) => i !== index);
                            setCoachAdvice({
                              ...coachAdvice,
                              questionnaire: updatedQuestionnaire
                            });
                          }}
                          className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2 text-sm"
                          title="削除"
                        >
                          ×
                        </button>
                      </div>
                      <div className="font-medium mb-0.5 text-xs">{q.question}</div>
                      <div className="text-xs text-gray-600">{q.why}</div>
                    </div>
                  ))
                }
              </div>
            </Field>

            {/* 想定シーン・利用者 */}
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
                  placeholder=""
                  rows={3}
                  minHeight="72px"
                  className="w-full px-3 py-2 bg-transparent border-none outline-none text-input-foreground"
                />
              
                
                {/* AIアドバイス: 想定シーン・利用者に関する質問 */}
                {coachAdvice && coachAdvice.questionnaire
                  .filter(q => q.field === "scenes" || q.field === "users")
                  .map((q, index) => (
                    <div key={index} className="px-3 py-2">
                      <div className="flex items-start justify-between mb-1">
                        <div className="font-medium text-red-600 text-xs">❓ AIからの質問</div>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedQuestionnaire = coachAdvice.questionnaire.filter((_, i) => i !== index);
                            setCoachAdvice({
                              ...coachAdvice,
                              questionnaire: updatedQuestionnaire
                            });
                          }}
                          className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2 text-sm"
                          title="削除"
                        >
                          ×
                        </button>
                      </div>
                      <div className="font-medium mb-0.5 text-xs">{q.question}</div>
                      <div className="text-xs text-gray-600">{q.why}</div>
                    </div>
                  ))
                }
              </div>
            </Field>

            {/* 差別化ポイント */}
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
                  placeholder=""
                  rows={3}
                  minHeight="72px"
                  className="w-full px-3 py-2 bg-transparent border-none outline-none text-input-foreground"
                />
              
                
                {/* AIアドバイス: 差別化ポイントに関する質問 */}
                {coachAdvice && coachAdvice.questionnaire
                  .filter(q => q.field === "differentiation")
                  .map((q, index) => (
                    <div key={index} className="px-3 py-2">
                      <div className="flex items-start justify-between mb-1">
                        <div className="font-medium text-red-600 text-xs">❓ AIからの質問</div>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedQuestionnaire = coachAdvice.questionnaire.filter((_, i) => i !== index);
                            setCoachAdvice({
                              ...coachAdvice,
                              questionnaire: updatedQuestionnaire
                            });
                          }}
                          className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2 text-sm"
                          title="削除"
                        >
                          ×
                        </button>
                      </div>
                      <div className="font-medium mb-0.5 text-xs">{q.question}</div>
                      <div className="text-xs text-gray-600">{q.why}</div>
                    </div>
                  ))
                }
              </div>
            </Field>

            {/* 応用・発展アイデア */}
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
                  placeholder=""
                  rows={3}
                  minHeight="72px"
                  className="w-full px-3 py-2 bg-transparent border-none outline-none text-input-foreground"
                />
              
                
                {/* AIアドバイス: 応用・発展アイデアに関する質問 */}
                {coachAdvice && coachAdvice.questionnaire
                  .filter(q => q.field === "extensions")
                  .map((q, index) => (
                    <div key={index} className="px-3 py-2">
                      <div className="flex items-start justify-between mb-1">
                        <div className="font-medium text-red-600 text-xs">❓ AIからの質問</div>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedQuestionnaire = coachAdvice.questionnaire.filter((_, i) => i !== index);
                            setCoachAdvice({
                              ...coachAdvice,
                              questionnaire: updatedQuestionnaire
                            });
                          }}
                          className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2 text-sm"
                          title="削除"
                        >
                          ×
                        </button>
                      </div>
                      <div className="font-medium mb-0.5 text-xs">{q.question}</div>
                      <div className="text-xs text-gray-600">{q.why}</div>
                    </div>
                  ))
                }
              </div>
            </Field>

            </div>

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
              
              {showUrlValidationHelp && (
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
          category={formData.category || ""}
          tags={formData.tags || []}
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
      </div>
    </div>
  );
}