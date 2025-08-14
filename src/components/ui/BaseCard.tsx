'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Eye } from 'lucide-react';
import { Post } from '@/types/Post';
import { HorizontalTagList } from './HorizontalTagList';
import { findCategoryById } from '@/lib/constants/categories';
import { useAuth } from '@/hooks/useAuth';
import { apiSetFavorite, isFavorited as checkIsFavorited, getFavoriteCount } from '@/lib/favorites';

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
  const { user } = useAuth();
  
  const [isFavorited, setIsFavorited] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
  const [actualFavoriteCount, setActualFavoriteCount] = useState(post.favoriteCount ?? post.likes ?? 0);

  const category = post.categoryId ? findCategoryById(post.categoryId) : null;
  const categoryName = category?.name || post.customCategory || 'その他';
  const sizeStyles = SIZE_STYLES[size];

  // いいね状態の初期化
  useEffect(() => {
    const initializeFavoriteState = async () => {
      if (user) {
        try {
          const fav = await checkIsFavorited(post.id, user.uid);
          setIsFavorited(fav);
        } catch (error) {
          console.error('Failed to check favorite status:', error);
        }
      }
      
      try {
        const count = await getFavoriteCount(post.id);
        setActualFavoriteCount(count);
      } catch (error) {
        console.error('Failed to get favorite count:', error);
      }
    };

    initializeFavoriteState();
  }, [post.id, user]);

  const handleCardClick = () => {
    router.push(`/posts/${post.id}`);
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // カードクリックを防ぐ
    
    if (!user || isUpdatingFavorite) return;
    
    const desired = !isFavorited;
    setIsUpdatingFavorite(true);
    
    // 楽観更新
    setIsFavorited(desired);
    
    try {
      await apiSetFavorite(post.id, user.uid, desired);
      
      // カウント更新
      const count = await getFavoriteCount(post.id);
      setActualFavoriteCount(count);
      
    } catch (error) {
      // ロールバック
      setIsFavorited(!desired);
      console.error('Favorite operation failed:', error);
    } finally {
      setIsUpdatingFavorite(false);
    }
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
            {(post.thumbnail) ? (
              <img 
                src={post.thumbnail} 
                alt={post.title}
                className="w-full h-full object-cover border border-gray-300"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <span className="text-muted-foreground font-medium text-xs">画像なし</span>
              </div>
            )}
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
                      createdAt: new Date().toISOString(), 
                      updatedAt: new Date().toISOString()
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
                className="flex items-center space-x-3 flex-shrink-0"
                style={{ transform: 'translateY(+2px)' }} 
              >
              <button
                onClick={handleFavoriteClick}
                disabled={!user || isUpdatingFavorite}
                className={`flex items-center space-x-0.5 transition-colors ${
                  user ? 'cursor-pointer hover:text-red-500' : 'cursor-default'
                } ${isUpdatingFavorite ? 'opacity-50' : ''}`}
                title={isFavorited ? 'お気に入りから削除' : 'お気に入りに追加'}
              >
                <Heart 
                  size={16} 
                  className={`flex-shrink-0 ${isFavorited ? 'fill-current text-red-500' : 'text-muted-foreground'}`} 
                />
                <span className={`text-sm font-bold ${isFavorited ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {formatNumber(actualFavoriteCount)}
                </span>
                {isUpdatingFavorite && (
                  <div className="ml-1 w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                )}
              </button>
              {showViews && (
                <div className="flex items-center space-x-0.5 text-muted-foreground">
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
          {(post.thumbnail) ? (
            <img 
              src={post.thumbnail} 
              alt={post.title}
              className="w-full h-full object-cover border border-gray-300"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <span className="text-muted-foreground font-medium text-xs">画像なし</span>
            </div>
          )}
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
                    createdAt: new Date().toISOString(), 
                    updatedAt: new Date().toISOString()
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
          <div className="flex items-center space-x-3 flex-shrink-0">
            <button
              onClick={handleFavoriteClick}
              disabled={!user || isUpdatingFavorite}
              className={`flex items-center space-x-0.5 transition-colors ${
                user ? 'cursor-pointer hover:text-red-500' : 'cursor-default'
              } ${isUpdatingFavorite ? 'opacity-50' : ''}`}
              title={isFavorited ? 'お気に入りから削除' : 'お気に入りに追加'}
            >
              <Heart 
                size={14} 
                className={`flex-shrink-0 ${isFavorited ? 'fill-current text-red-500' : 'text-muted-foreground'}`} 
              />
              <span className={`text-sm font-medium ${isFavorited ? 'text-red-500' : 'text-muted-foreground'}`}>
                {formatNumber(actualFavoriteCount)}
              </span>
              {isUpdatingFavorite && (
                <div className="ml-1 w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              )}
            </button>
            {showViews && (
              <div className="flex items-center space-x-0.5 text-muted-foreground">
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