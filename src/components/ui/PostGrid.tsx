'use client';

import React from 'react';
import { Post } from '@/types/Post';
import { BaseCard, BaseCardProps } from './BaseCard';

interface PostGridProps {
  posts: Post[];
  layout: 'grid' | 'list' | 'horizontal-scroll';
  responsive?: boolean; // デスクトップ/モバイル切り替えを有効にするか
  showRanking?: boolean; // ランキング番号を表示するか
  startRankFrom?: number; // ランキング開始番号（デフォルト: 1）
  className?: string;
  // BaseCardのプロパティを継承
  size?: BaseCardProps['size'];
  showCategory?: BaseCardProps['showCategory'];
  showViews?: BaseCardProps['showViews'];
  // グリッドのカスタマイズ
  gridCols?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  // リストのカスタマイズ
  spacing?: 'tight' | 'normal' | 'loose'; // space-y-2, space-y-3, space-y-4
}

/**
 * 作品一覧表示用の統合コンポーネント
 * - grid: レスポンシブグリッドレイアウト
 * - list: 縦並びリストレイアウト  
 * - horizontal-scroll: 横スクロールレイアウト
 */
export function PostGrid({ 
  posts, 
  layout, 
  responsive = false, 
  showRanking = false,
  startRankFrom = 1,
  className = '',
  size = 'medium',
  showCategory = true,
  showViews = true,
  gridCols = { sm: 2, md: 3, lg: 3, xl: 4 },
  spacing = 'normal'
}: PostGridProps) {
  
  // スペーシングクラス
  const spacingClass = {
    tight: 'space-y-2',
    normal: 'space-y-3', 
    loose: 'space-y-4'
  }[spacing];

  // グリッドカラムクラス生成
  const getGridColsClass = () => {
    const { sm = 2, md = 3, lg = 3, xl = 4 } = gridCols;
    // Tailwindの安全なクラス名を使用
    const smClass = `sm:grid-cols-${sm}`;
    const mdClass = `md:grid-cols-${md}`;
    const lgClass = `lg:grid-cols-${lg}`;
    const xlClass = `xl:grid-cols-${xl}`;
    return `grid grid-cols-1 ${smClass} ${mdClass} ${lgClass} ${xlClass} gap-6`;
  };

  // ランキング番号を計算
  const getRank = (index: number) => showRanking ? startRankFrom + index : undefined;

  // グリッドレイアウト
  if (layout === 'grid') {
    if (responsive) {
      return (
        <div className={className}>
          {/* 大画面：グリッド */}
          <div className={`hidden md:${getGridColsClass()}`}>
            {posts.map((post, index) => (
              <BaseCard
                key={post.id}
                post={post}
                size={size}
                layout="vertical"
                showCategory={showCategory}
                showViews={showViews}
                rank={getRank(index)}
              />
            ))}
          </div>
          
          {/* 小画面：リスト */}
          <div className={`md:hidden ${spacingClass}`}>
            {posts.map((post, index) => (
              <BaseCard
                key={post.id}
                post={post}
                size={size}
                layout="horizontal"
                showCategory={showCategory}
                showViews={showViews}
                rank={getRank(index)}
              />
            ))}
          </div>
        </div>
      );
    } else {
      return (
        <div className={`${getGridColsClass()} ${className}`}>
          {posts.map((post, index) => (
            <BaseCard
              key={post.id}
              post={post}
              size={size}
              layout="vertical"
              showCategory={showCategory}
              showViews={showViews}
              rank={getRank(index)}
            />
          ))}
        </div>
      );
    }
  }

  // リストレイアウト
  if (layout === 'list') {
    return (
      <div className={`${spacingClass} ${className}`}>
        {posts.map((post, index) => (
          <BaseCard
            key={post.id}
            post={post}
            size={size}
            layout="horizontal"
            showCategory={showCategory}
            showViews={showViews}
            rank={getRank(index)}
          />
        ))}
      </div>
    );
  }

  // 横スクロールレイアウト（基本実装、後でHorizontalScrollContainerに置き換え予定）
  if (layout === 'horizontal-scroll') {
    return (
      <div className={`overflow-x-auto scrollbar-hide ${className}`}>
        <div className="flex gap-4 pb-4 pt-3 px-3">
          {posts.map((post, index) => (
            <div key={post.id} className="w-72 flex-shrink-0">
              <BaseCard
                post={post}
                size={size}
                layout="vertical"
                showCategory={showCategory}
                showViews={showViews}
                rank={getRank(index)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}