"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
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

    try {
      // Generate tags using AI
      const response = await fetch("/api/generate-tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          max: Math.max(1, maxTags - currentTags.length), // Only generate what's needed
          locale: "ja",
          // existingTags will be fetched by the service
        }),
      });

      if (!response.ok) {
        throw new Error("タグ生成に失敗しました");
      }

      const data: GenerateTagsResponse = await response.json();
      
      if (data.all && data.all.length > 0) {
        // Merge with current tags, avoiding duplicates
        const newTags = [...currentTags];
        for (const tag of data.all) {
          if (!newTags.includes(tag) && newTags.length < maxTags) {
            newTags.push(tag);
          }
        }
        onTagsGenerated(newTags);
      } else {
        setError("適切なタグが見つかりませんでした");
      }
    } catch (err) {
      console.error("Tag generation error:", err);
      setError(err instanceof Error ? err.message : "タグ生成中にエラーが発生しました");
    } finally {
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