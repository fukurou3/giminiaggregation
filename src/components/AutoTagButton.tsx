"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { getAuth } from "firebase/auth";
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

  const handleGenerateTags = async () => {
    if (!title.trim() || isLoading || disabled) return;

    setIsLoading(true);
    setError(null);

    // タイムアウト制御
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15秒

    try {
      // Firebase Auth トークン取得
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken?.();
      
      if (!idToken) {
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
          throw new Error("アクセスが集中しています。少し待って再試行してください。");
        } else if (response.status === 401) {
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
      console.error("Tag generation error:", err);
      
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
        {isLoading ? "生成中..." : "タイトルからタグ生成"}
      </button>
      
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      
      {!canGenerate && !isLoading && (
        <p className="text-xs text-muted-foreground">
          {!title.trim() 
            ? "タイトルを入力してください" 
            : currentTags.length >= maxTags 
            ? "タグの上限に達しています"
            : ""}
        </p>
      )}
    </div>
  );
}