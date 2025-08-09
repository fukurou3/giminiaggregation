'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Eye } from 'lucide-react';
import { Post } from '@/types/Post';
import { HorizontalTagList } from './HorizontalTagList';
import { findCategoryById } from '@/lib/constants/categories';

const SIZE_STYLES = {
  small: {
    card: 'p-1.5',
    image: 'aspect-[5/3]',
    title: 'text-xs font-semibold',
    description: 'text-xs'
  },
  medium: {
    card: 'p-2',
    image: 'aspect-[5/3]',
    title: 'text-sm font-bold',
    description: 'text-xs'
  },
  large: {
    card: 'p-3',
    image: 'aspect-[5/3]',
    title: 'text-base font-bold',
    description: 'text-xs'
  }
} as const;

// 数値を短縮表示する関数
const formatNumber = (num: number): string => {
  if (num < 10000) return num.toString()
  if (num < 1000000) {
    const k = num / 1000
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`
  }
  const m = num / 1000000
  return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
}



const CARD_STYLES = "transition-all duration-300 group";

export interface BaseCardProps {
  post: Post;
  size?: 'small' | 'medium' | 'large';
  layout?: 'vertical' | 'horizontal';
  showCategory?: boolean;
  showViews?: boolean;
  className?: string;
  rank?: number;
}

/**
 * ランキング画面用の詳細表示カードコンポーネント
 * - カテゴリ、タグ、説明文、いいね数、閲覧数を表示
 */
export function BaseCard({ post, size = 'medium', layout = 'vertical', showCategory = true, showViews = true, className, rank }: BaseCardProps) {
  const router = useRouter();

  const category = post.categoryId ? findCategoryById(post.categoryId) : null;
  const categoryName = category?.name || post.customCategory || 'その他';
  const sizeStyles = SIZE_STYLES[size];

  const handleCardClick = () => {
    router.push(`/posts/${post.id}`);
  };


  if (layout === 'horizontal') {
    return (
      <div
        onClick={handleCardClick}
        className={`${CARD_STYLES} ${className || ''} flex cursor-pointer w-full relative`}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
      >
        {/* 拡張枠 */}
        <div className="absolute inset-y-0 left-0 right-0 pointer-events-none z-0 rounded-lg" style={{backgroundColor: '#f4f7fb'}}></div>
        {/* サムネイル画像とカテゴリ */}
        <div className="w-44 flex-shrink-0 flex flex-col justify-center h-26">
          {/* サムネイル画像 */}
          <div className="bg-muted relative overflow-hidden ml-2 mt-0 shadow-md rounded-sm" style={{width: '155px', height: '93px'}}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <span className="text-muted-foreground font-medium text-xs">Canvas</span>
            </div>
          </div>
          {/* カテゴリ表示 */}
          {showCategory && (
            <div className="mt-1">
              <span className="bg-primary text-primary-foreground rounded-full font-medium px-1.5 py-0.5 text-xs">
                {categoryName}
              </span>
            </div>
          )}
        </div>

        {/* コンテンツ - CSS Grid 3行2列構造 */}
        <div className="flex-1 -ml-2 pr-2 py-2 min-w-0 h-26 relative z-5 grid grid-rows-[auto_minmax(0,28px)_minmax(0,28px)] grid-cols-[1fr_auto] gap-1">
          {/* Row 1: タイトル（左右いっぱい） */}
          <div className="col-span-2 flex items-center gap-2">
            {rank && (
              <span className="text-foreground font-bold text-sm flex-shrink-0 mr-1">
                {rank}.
              </span>
            )}
            <h3 className="text-foreground line-clamp-1 hover:text-primary transition-colors text-sm font-bold">
              {post.title}
            </h3>
          </div>

          {/* Row 2-3 左: タグ表示（2行固定、overflow禁止） */}
          <div className="row-span-2 min-w-0 overflow-hidden h-full">
            {post.tagIds && post.tagIds.length > 0 && (
              <HorizontalTagList
                tags={post.tagIds.map(tagId => ({
                  id: tagId, 
                  name: tagId.replace(/_/g, ' '), 
                  aliases: [], 
                  count: 0, 
                  isOfficial: false, 
                  views: 0, 
                  favorites: 0, 
                  flagged: false,
                  createdAt: new Date(), 
                  updatedAt: new Date()
                }))}
                postTitle={post.title}
                maxRows={2}
                gap={4}
                tagProps={{
                  size: 'sm',
                  variant: 'ghost'
                }}
                className="max-w-full h-full"
                fillHeight={true}
              />
            )}
          </div>
          
          {/* Row 3 右: いいね数と閲覧数（右下固定） */}
          <div className="row-start-3 col-start-2 flex items-end justify-end">
            <div className="flex items-center space-x-3 text-muted-foreground flex-shrink-0">
              <div className="flex items-center space-x-0.5">
                <Heart size={14} className="flex-shrink-0" />
                <span className="text-sm font-medium">{formatNumber(post.favoriteCount ?? post.likes ?? 0)}</span>
              </div>
              {showViews && (
                <div className="flex items-center space-x-0.5">
                  <Eye size={14} className="flex-shrink-0" />
                  <span className="text-sm font-medium">{formatNumber(post.views || 0)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleCardClick}
      className={`${CARD_STYLES} ${className || ''} cursor-pointer max-w-full rounded-lg pt-0`}
      style={{backgroundColor: '#f4f7fb'}}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
    >
      {/* プレビュー画像 */}
      <div className={`bg-muted relative overflow-hidden ${sizeStyles.image} mx-1 mt-1 rounded-md`}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <span className="text-muted-foreground font-medium text-xs">Canvas</span>
        </div>
      </div>

      {/* コンテンツ */}
      <div className={`${sizeStyles.card} flex flex-col`}>
        {/* タイトル */}
        <div className="flex items-center gap-2 mb-1">
          {rank && (
            <span className="text-foreground font-bold text-sm flex-shrink-0 mr-1">
              {rank}.
            </span>
          )}
          <h3 className="text-foreground line-clamp-1 hover:text-primary transition-colors text-sm font-bold">
            {post.title}
          </h3>
        </div>
        
        {/* 説明文 */}
        <div className="h-10 mb-2">
          {post.description && (
            <p className="text-black line-clamp-2 text-xs mt-1 break-words">
              {post.description}
            </p>
          )}
        </div>

        {/* タグ */}
        <div className="h-12 flex items-start text-xs mb-2 relative">
          <div className="min-w-0 flex-1 pr-16"> {/* 右パディングでいいね部分のスペースを確保 */}
            {post.tagIds && post.tagIds.length > 0 && (
              <HorizontalTagList
                tags={post.tagIds.map(tagId => ({
                  id: tagId, 
                  name: tagId.replace(/_/g, ' '), 
                  aliases: [], 
                  count: 0, 
                  isOfficial: false, 
                  views: 0, 
                  favorites: 0, 
                  flagged: false,
                  createdAt: new Date(), 
                  updatedAt: new Date()
                }))}
                postTitle={post.title}
                maxRows={2}
                gap={4}
                tagProps={{
                  size: 'sm',
                  variant: 'ghost'
                }}
                className="max-w-full"
              />
            )}
          </div>
          
          {/* いいね数と閲覧数 */}
          <div className="absolute bottom-0 right-0 flex items-center space-x-3 text-muted-foreground">
            <div className="flex items-center space-x-0.5">
              <Heart size={14} className="flex-shrink-0" />
              <span className="text-sm font-medium">{formatNumber(post.favoriteCount ?? post.likes ?? 0)}</span>
            </div>
            {showViews && (
              <div className="flex items-center space-x-0.5">
                <Eye size={14} className="flex-shrink-0" />
                <span className="text-sm font-medium">{formatNumber(post.views || 0)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}