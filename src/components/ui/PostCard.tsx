'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Eye } from 'lucide-react';
import { Post } from '@/types/Post';
import { TagChip } from './TagChip';

export interface PostCardProps {
  post: Post;
  layout?: 'vertical' | 'horizontal';
  showCategory?: boolean;
  showStats?: boolean;
  className?: string;
}

/**
 * 統一された投稿カードコンポーネント
 * - 全ての投稿表示に使用する単一のコンポーネント
 * - レイアウトとオプションをプロパティで制御
 */
export const PostCard = React.memo<PostCardProps>(function PostCard({
  post,
  layout = 'vertical',
  showCategory = false,
  showStats = true,
  className = '',
}) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/posts/${post.id}`);
  };

  const handleTagClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 基本スタイル
  const baseClasses = [
    'bg-background',
    'border border-border',
    'rounded-xl',
    'shadow-sm hover:shadow-md',
    'transition-all duration-300',
    'overflow-hidden',
    'group',
    'cursor-pointer',
  ].join(' ');

  // 統計情報コンポーネント
  const StatsComponent = ({ compact = false }: { compact?: boolean }) => {
    if (!showStats) return null;

    const iconSize = compact ? 10 : 12;
    const textClass = compact ? 'text-xs' : 'text-sm';

    return (
      <div className={`flex items-center gap-3 ${textClass} text-muted-foreground`}>
        <div className="flex items-center gap-1">
          <Heart size={iconSize} />
          <span>{post.favoriteCount ?? post.likes ?? 0}</span>
        </div>
        <div className="flex items-center gap-1">
          <Eye size={iconSize} />
          <span>{post.views ?? 0}</span>
        </div>
      </div>
    );
  };

  // タグコンポーネント
  const TagsComponent = ({ maxTags = 3 }: { maxTags?: number }) => {
    const hasTagIds = post.tagIds && post.tagIds.length > 0;

    if (!hasTagIds) return null;

    return (
      <div className="flex gap-1 overflow-hidden min-w-0 flex-wrap">
        {/* tagIds優先 */}
        {hasTagIds && post.tagIds!.slice(0, maxTags).map((tagId) => (
          <div key={`tagid-${tagId}`} onClick={handleTagClick} className="inline-block">
            <TagChip
              tag={{
                id: tagId,
                name: tagId.replace(/_/g, ' '),
                aliases: [],
                count: 0,
                isOfficial: false,
                views: 0,
                favorites: 0,
                flagged: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              }}
              size="sm"
              variant="ghost"
              showIcon={false}
            />
          </div>
        ))}

      </div>
    );
  };

  // 横長レイアウト
  if (layout === 'horizontal') {
    return (
      <div
        onClick={handleCardClick}
        className={`${baseClasses} flex w-full ${className}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
        aria-label={`投稿「${post.title}」を開く`}
      >
        {/* サムネイル画像 */}
        <div className="w-32 h-24 bg-muted relative overflow-hidden flex-shrink-0 rounded-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <span className="text-muted-foreground font-medium text-xs">Canvas</span>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          {/* タイトル */}
          <h3 className="text-foreground line-clamp-2 group-hover:text-primary transition-colors text-sm font-bold">
            {post.title}
          </h3>

          {/* 説明文（ある場合） */}
          {post.description && (
            <p className="text-muted-foreground line-clamp-1 text-xs mt-1 flex-1">
              {post.description}
            </p>
          )}

          {/* 下部: カテゴリ、タグ、統計 */}
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* カテゴリ */}
              {showCategory && (
                <span className="bg-primary text-primary-foreground rounded-full font-medium px-2 py-1 text-xs whitespace-nowrap">
                  {post.customCategory}
                </span>
              )}

              {/* タグ */}
              <TagsComponent maxTags={2} />
            </div>

            {/* 統計 */}
            <StatsComponent compact />
          </div>
        </div>
      </div>
    );
  }

  // 縦型レイアウト（デフォルト）
  return (
    <div
      onClick={handleCardClick}
      className={`${baseClasses} w-[340px] max-w-full ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
      aria-label={`投稿「${post.title}」を開く`}
    >
      {/* プレビュー画像 */}
      <div className="bg-muted relative overflow-hidden aspect-[5/3] rounded-t-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <span className="text-muted-foreground font-medium text-sm">Canvas</span>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-4 space-y-3">
        {/* タイトル */}
        <h3 className="text-foreground line-clamp-2 group-hover:text-primary transition-colors text-base font-bold">
          {post.title}
        </h3>

        {/* 説明文 */}
        {post.description && (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {post.description}
          </p>
        )}

        {/* カテゴリ */}
        {showCategory && (
          <div className="flex items-center">
            <span className="bg-primary text-primary-foreground rounded-full font-medium px-3 py-1 text-sm">
              {post.customCategory}
            </span>
          </div>
        )}

        {/* タグ */}
        <TagsComponent maxTags={3} />

        {/* 統計 */}
        <StatsComponent />
      </div>
    </div>
  );
});