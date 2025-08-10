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
        className={`${CARD_STYLES} ${className || ''} cursor-pointer w-full`}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
      >
        {/* CSS Gridレイアウト */}
        <div className="grid bg-white rounded-lg overflow-hidden" 
          style={{
            gridTemplateColumns: '120px 1fr',
            gridTemplateRows: '88px auto',
            gap: '0',
            paddingTop: '0.6rem',
            paddingBottom: '0.3rem',
            paddingLeft: '0.6rem',
            paddingRight: '0.6rem',
            boxShadow: '0 1px 4px -0px rgba(0, 0, 0, 0.17)'
          }}>
          
          {/* 画像 - 左上 */}
          <div className="bg-muted relative overflow-hidden rounded-sm" 
            style={{
              gridColumn: '1',
              gridRow: '1',
              width: '120px',
              height: '72px'
            }}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <span className="text-muted-foreground font-medium text-xs">Canvas</span>
            </div>
          </div>
          
          {/* タイトル＋説明 - 右上 */}
          <div style={{gridColumn: '2', gridRow: '1'}} className="flex flex-col justify-start px-2">
            {/* タイトル */}
            <div className="flex items-center gap-2 mb-1 mt-2">
              {rank && (
                <span className="text-foreground font-bold text-sm flex-shrink-0">
                  {rank}.
                </span>
              )}
              <h3 className="text-foreground line-clamp-1 hover:text-primary transition-colors text-sm font-bold">
                {post.title}
              </h3>
            </div>
            
            {/* 説明文 */}
            <p className="text-black line-clamp-2 text-xs break-words font-normal leading-tight">
              {post.description || ''}
            </p>
          </div>
          
          {/* タグ＋いいね数 - 下部全体 */}
          <div style={{gridColumn: '1 / 3', gridRow: '2', height: '18px', transform: 'translateY(-20px)'}} 
            className="flex items-baseline justify-between ">
            {/* タグエリア */}
            <div className="flex-1 min-w-0">
              {post.tagIds && post.tagIds.length > 0 && (
                <HorizontalTagList
                  tags={post.tagIds
                    .map(tagId => ({
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
                    }))
                    .sort((a, b) => a.name.length - b.name.length)}
                  postTitle={post.title}
                  maxRows={1}
                  gap={2}
                  tagProps={{
                    size: 'sm',
                    variant: 'outlined'
                  }}
                  className="max-w-full"
                />
              )}
            </div>
            
            {/* いいね数と閲覧数 */}
            <div 
                className="flex items-center space-x-3 text-muted-foreground flex-shrink-0"
                style={{ transform: 'translateY(+2px)' }} 
              >
              <div className="flex items-center space-x-0.5">
                <Heart size={16} className="flex-shrink-0" />
                <span className="text-sm font-bold">{formatNumber(post.favoriteCount ?? post.likes ?? 0)}</span>
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
      className={`${CARD_STYLES} ${className || ''} cursor-pointer max-w-full`}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
    >
      {/* CSS Gridレイアウト */}
      <div className="grid bg-white rounded-lg overflow-hidden" 
        style={{
          gridTemplateRows: 'auto auto auto auto',
          gridTemplateColumns: '1fr',
          gap: '0',
          padding: '0.5rem',
          boxShadow: '0 1px 4px -0px rgba(0, 0, 0, 0.1)'
        }}>
        
        {/* 画像 - 上部 */}
        <div className="bg-muted relative overflow-hidden rounded-md" 
          style={{
            gridRow: '1',
            aspectRatio: '5/3'
          }}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <span className="text-muted-foreground font-medium text-xs">Canvas</span>
          </div>
        </div>
        
        {/* タイトル */}
        <div style={{gridRow: '2', marginTop: '0.5rem'}} className="flex items-center gap-2">
          {rank && (
            <span className="text-foreground font-bold text-sm flex-shrink-0">
              {rank}.
            </span>
          )}
          <h3 className="text-foreground line-clamp-1 hover:text-primary transition-colors text-sm font-bold">
            {post.title}
          </h3>
        </div>
        
        {/* 説明文 */}
        <div style={{gridRow: '3', height: '2.25rem', marginTop: '0.5rem'}}>
          <p className="text-black line-clamp-2 text-xs break-words font-normal leading-tight overflow-hidden">
            {post.description || ''}
          </p>
        </div>
        
        {/* タグ＋いいね数 */}
        <div style={{gridRow: '4', marginTop: '-0.25rem'}} className="flex items-end justify-between">
          {/* タグエリア */}
          <div className="flex-1 min-w-0">
            {post.tagIds && post.tagIds.length > 0 && (
              <HorizontalTagList
                tags={post.tagIds
                  .map(tagId => ({
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
                  }))
                  .sort((a, b) => a.name.length - b.name.length)}
                postTitle={post.title}
                maxRows={1}
                gap={2}
                tagProps={{
                  size: 'sm',
                  variant: 'outlined'
                }}
                className="max-w-full"
              />
            )}
          </div>
          
          {/* いいね数と閲覧数 */}
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