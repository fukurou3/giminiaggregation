"use client";

import { useState } from "react";
import { Sparkles, Loader2, LogIn } from "lucide-react";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { TagRepository } from "@/lib/tags/repository";

interface AutoTagButtonProps {
  title: string;
  description?: string;
  currentTags: string[];
  onTagsGenerated: (tags: string[]) => void;
  maxTags?: number;
  disabled?: boolean;
}

interface GenerateTagsResponse {
  picked: string[];
  fresh: string[];
  all: string[];
  retryAfter?: number; // 429エラー時の待ち時間（秒）
}

export function AutoTagButton({
  title,
  description = "",
  currentTags,
  onTagsGenerated,
  maxTags = 5,
  disabled = false,
}: AutoTagButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  // 再ログイン処理
  const handleReLogin = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setAuthError(false);
      setError(null);
    } catch (error) {
      console.error("Re-login failed:", error instanceof Error ? error.constructor.name : 'UnknownError');
      setError("ログインに失敗しました。再度お試しください。");
    }
  };

  const handleGenerateTags = async () => {
    if (!title.trim() || isLoading || disabled) return;

    setIsLoading(true);
    setError(null);
    setAuthError(false);
    setRetryAfter(null);

    // タイムアウト制御
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15秒

    try {
      // Firebase Auth トークン取得
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken?.();
      
      if (!idToken) {
        setAuthError(true);
        throw new Error("ログインが必要です");
      }

      // Generate tags using AI
      const response = await fetch("/api/generate-tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          max: Math.max(1, maxTags - currentTags.length), // Only generate what's needed
          locale: "ja",
          // existingTags will be fetched by the service
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          const waitTime = errorData.retryAfter || 60;
          setRetryAfter(waitTime);
          throw new Error(`アクセスが集中しています。${waitTime}秒後に再試行してください。`);
        } else if (response.status === 401) {
          setAuthError(true);
          throw new Error("認証エラー：再ログインしてください。");
        }
        throw new Error("タグ生成に失敗しました");
      }

      const data: GenerateTagsResponse = await response.json();
      
      if (data.all && data.all.length > 0) {
        // 正規化関数（クライアント側での軽量重複防止）
        const normalize = (s: string) =>
          s.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");

        // Merge with current tags, avoiding duplicates with normalization
        const newTags = [...currentTags];
        for (const tag of data.all) {
          const normalizedTag = normalize(tag);
          const isDuplicate = newTags.some(t => normalize(t) === normalizedTag);
          
          if (!isDuplicate && newTags.length < maxTags) {
            newTags.push(tag);
          }
        }
        onTagsGenerated(newTags);
      } else {
        setError("適切なタグが見つかりませんでした");
      }
    } catch (err) {
      // プライバシー配慮：エラー種別のみをログ出力（個人情報除外）
      const errorType = err instanceof DOMException ? err.name : 
                       err instanceof Error ? err.constructor.name : 'UnknownError';
      console.error("Tag generation error type:", errorType);
      
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError("リクエストがタイムアウトしました。再度お試しください。");
      } else {
        setError(err instanceof Error ? err.message : "タグ生成中にエラーが発生しました");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const canGenerate = title.trim().length > 0 && currentTags.length < maxTags && !disabled;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleGenerateTags}
          disabled={!canGenerate || isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isLoading ? "生成中..." : "AIによるタグ生成"}
        </button>
        
        {!canGenerate && !isLoading && !title.trim() && (
          <p className="text-xs text-muted-foreground">
            タイトルと説明文を入力してください
          </p>
        )}
      </div>
      
      {error && (
        <div className="text-sm">
          <p className="text-error">{error}</p>
          {authError && (
            <button
              onClick={handleReLogin}
              className="mt-2 inline-flex items-center gap-1 text-primary hover:text-primary/80 underline"
            >
              <LogIn className="h-3 w-3" />
              再ログイン
            </button>
          )}
        </div>
      )}
      
      {retryAfter && !error && (
        <div className="text-sm text-warning">
          <p>レート制限中: {retryAfter}秒後に再試行可能</p>
        </div>
      )}
    </div>
  );
}