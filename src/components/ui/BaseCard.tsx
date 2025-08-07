'use client';

import { useRouter } from 'next/navigation';
import { Heart, Eye } from 'lucide-react';
import { Post } from '@/types/Post';
import { TagChip } from './TagChip';
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

const CARD_STYLES = "bg-background border border-border rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group";

export interface BaseCardProps {
  post: Post;
  size?: 'small' | 'medium' | 'large';
  layout?: 'vertical' | 'horizontal';
  showCategory?: boolean;
  showViews?: boolean;
  className?: string;
}

/**
 * ランキング画面用の詳細表示カードコンポーネント
 * - カテゴリ、タグ、説明文、いいね数、閲覧数を表示
 */
export function BaseCard({ post, size = 'medium', layout = 'vertical', showCategory = true, showViews = true, className }: BaseCardProps) {
  const router = useRouter();

  const category = post.categoryId ? findCategoryById(post.categoryId) : null;
  const categoryName = category?.name || post.customCategory || 'その他';
  const sizeStyles = SIZE_STYLES[size];

  const handleCardClick = () => {
    router.push(`/posts/${post.id}`);
  };

  const handleTagClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (layout === 'horizontal') {
    return (
      <div
        onClick={handleCardClick}
        className={`${CARD_STYLES} ${className || ''} flex cursor-pointer w-full`}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
      >
        {/* サムネイル画像 */}
        <div className="w-32 h-32 bg-muted relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <span className="text-muted-foreground font-medium text-xs">Canvas</span>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 p-2 flex flex-col min-w-0 h-32">
          {/* タイトル */}
          <h3 className="text-foreground line-clamp-1 group-hover:text-primary transition-colors text-sm font-bold mb-1">
            {post.title}
          </h3>
          
          {/* 説明文 */}
          {post.description && (
            <p className="text-muted-foreground line-clamp-2 text-xs mb-2 flex-1">
              {post.description}
            </p>
          )}

          {/* カテゴリとタグ */}
          {showCategory && (
            <div className="flex items-center flex-wrap gap-1 mb-1">
              <span className="bg-primary text-primary-foreground rounded-full font-medium px-1.5 py-0.5 text-xs">
                {categoryName}
              </span>
              
              {post.tagIds && post.tagIds.slice(0, 2).map((tagId) => (
                <div key={`tagid-wrapper-${tagId}`} onClick={handleTagClick}>
                  <TagChip
                    tag={{ 
                      id: tagId, name: tagId.replace(/_/g, ' '), aliases: [], count: 0, 
                      isOfficial: false, views: 0, favorites: 0, flagged: false,
                      createdAt: new Date(), updatedAt: new Date()
                    }}
                    size="sm" variant="ghost" showIcon={false}
                  />
                </div>
              ))}
            </div>
          )}

          {/* いいね数と閲覧数 */}
          <div className="flex items-center justify-end space-x-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Heart size={10} />
              <span>{post.favoriteCount ?? post.likes ?? 0}</span>
            </div>
            {showViews && (
              <div className="flex items-center space-x-1">
                <Eye size={10} />
                <span>{post.views || 0}</span>
              </div>
            )}
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
      {/* プレビュー画像 */}
      <div className={`bg-muted relative overflow-hidden ${sizeStyles.image}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <span className="text-muted-foreground font-medium text-xs">Canvas</span>
        </div>
      </div>

      {/* コンテンツ */}
      <div className={`${sizeStyles.card} flex flex-col h-32`}>
        {/* タイトル */}
        <h3 className={`text-foreground line-clamp-2 group-hover:text-primary transition-colors ${sizeStyles.title} mb-1`}>
          {post.title}
        </h3>
        
        {/* 説明文 */}
        <div className="flex-1 mb-2">
          {post.description && (
            <p className={`text-muted-foreground line-clamp-2 ${sizeStyles.description}`}>
              {post.description}
            </p>
          )}
        </div>

        {/* カテゴリとタグ */}
        {showCategory && (
          <div className="flex items-center flex-wrap gap-1 mb-2">
            <span className="bg-primary text-primary-foreground rounded-full font-medium px-1.5 py-0.5 text-xs">
              {categoryName}
            </span>
            
            {post.tagIds && post.tagIds.slice(0, 2).map((tagId) => (
              <div key={`tagid-wrapper-${tagId}`} onClick={handleTagClick} className="inline-block">
                <TagChip
                  tag={{ 
                    id: tagId, name: tagId.replace(/_/g, ' '), aliases: [], count: 0, 
                    isOfficial: false, views: 0, favorites: 0, flagged: false,
                    createdAt: new Date(), updatedAt: new Date()
                  }}
                  size="sm" variant="ghost" showIcon={false}
                />
              </div>
            ))}
          </div>
        )}

        {/* いいね数と閲覧数 */}
        <div className="flex items-center justify-end space-x-2 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Heart size={10} />
            <span>{post.favoriteCount ?? post.likes ?? 0}</span>
          </div>
          {showViews && (
            <div className="flex items-center space-x-1">
              <Eye size={10} />
              <span>{post.views || 0}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}