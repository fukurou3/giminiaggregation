'use client';

import { useRouter } from 'next/navigation';
import { Heart, Eye } from 'lucide-react';
import { Post } from '@/types/Post';
import { TagChip } from './TagChip';
import { findCategoryById } from '@/lib/constants/categories';

// Style constants
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

const VARIANT_STYLES = {
  work: {
    card: "bg-background border border-border rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group",
    padding: 'p-3',
    title: 'font-bold text-base',
    description: 'text-xs',
    image: 'aspect-[5/3]'
  },
  site: {
    card: "bg-background border border-border rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group",
    padding: 'p-3',
    title: 'font-bold text-base',
    description: 'text-xs',
    image: 'aspect-[5/3]'
  }
} as const;

export interface BaseCardProps {
  post: Post;
  size?: 'small' | 'medium' | 'large';
  variant?: 'work' | 'site';
  layout?: 'vertical' | 'horizontal';
  showCategory?: boolean;
  showViews?: boolean;
  className?: string;
}

export function BaseCard({ post, size = 'medium', variant = 'work', layout = 'vertical', showCategory = true, showViews = true, className }: BaseCardProps) {
  const router = useRouter();

  // Get category name from categoryId
  const category = post.categoryId ? findCategoryById(post.categoryId) : null;
  const categoryName = category?.name || post.customCategory || 'その他';

  // Get styles based on size and variant
  const sizeStyles = SIZE_STYLES[size];
  const variantStyles = VARIANT_STYLES[variant];
  
  const cardClasses = variant === 'site' ? variantStyles.padding : sizeStyles.card;
  const titleClasses = variant === 'site' ? variantStyles.title : sizeStyles.title;
  const descriptionClasses = variant === 'site' ? variantStyles.description : sizeStyles.description;
  const imageClasses = variant === 'site' ? variantStyles.image : sizeStyles.image;
  const cardStyling = variantStyles.card;

  const previewText = variant === 'site' ? 'Canvas Preview' : 'Canvas';

  // Click handlers
  const handleCardClick = () => {
    router.push(`/posts/${post.id}`);
  };

  const handleTagClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 横長レイアウトの場合
  if (layout === 'horizontal') {
    return (
      <div
        onClick={handleCardClick}
        className={`${cardStyling} ${className || ''} flex cursor-pointer w-full`}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
      >
        {/* サムネイル画像 */}
        <div className="w-32 h-32 bg-muted relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <span className="text-muted-foreground font-medium text-xs">
              {previewText}
            </span>
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

          {/* お気に入り数と閲覧数 */}
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

  // デフォルトの縦長レイアウトの場合
  return (
    <div
      onClick={handleCardClick}
      className={`${cardStyling} ${className || ''} cursor-pointer max-w-full`}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
    >
      {/* Preview Image */}
      <div className={`bg-muted relative overflow-hidden ${imageClasses}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <span className={`text-muted-foreground font-medium ${variant === 'site' ? 'text-xs' : 'text-xs'}`}>
            {previewText}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className={`${cardClasses} flex flex-col h-32`}>
        {/* Title */}
        <h3 className={`text-foreground line-clamp-2 group-hover:text-primary transition-colors ${titleClasses} mb-1`}>
          {post.title}
        </h3>
        
        {/* Description */}
        <div className="flex-1 mb-2">
          {post.description && (
            <p className={`text-muted-foreground line-clamp-2 ${descriptionClasses}`}>
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

        {/* お気に入り数と閲覧数 */}
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