'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Post } from '@/types/Post';
import { TagChip } from './TagChip';

interface CategoryCardProps {
  post: Post;
  layout?: 'vertical' | 'horizontal';
  className?: string;
}

/**
 * カテゴリ画面専用の作品カードコンポーネント
 * - カテゴリ情報を表示しない（カテゴリページで使用されるため）
 * - シンプルなレイアウトで統計情報のみ表示
 */
export function CategoryCard({ post, layout = 'vertical', className = '' }: CategoryCardProps) {
  // 追加するベースクラス（BaseCard の work.variant.card と同等）
  const baseClasses = [
    'bg-background',
    'border border-border',
    'rounded-lg',
    'shadow-sm hover:shadow-md',
    'transition-all duration-300',
    'overflow-hidden',
    'group',
    'cursor-pointer'
  ].join(' ');

  const flexClass = layout === 'horizontal' ? 'flex' : '';
  const cardClasses = [baseClasses, flexClass, className]
    .filter(Boolean)
    .join(' ');

  // 横長レイアウトの場合
  if (layout === 'horizontal') {
    return (
      <Link href={`/posts/${post.id}`} className={cardClasses}>
        {/* サムネイル画像 */}
        <div className="w-32 h-24 bg-muted relative overflow-hidden flex-shrink-0 rounded-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <span className="text-muted-foreground font-medium text-xs">
              Canvas
            </span>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 p-2 flex flex-col justify-between min-w-0 h-24">
          {/* タイトル */}
          <h3 className="text-foreground line-clamp-2 group-hover:text-primary transition-colors text-sm font-bold">
            {post.title}
          </h3>
          
          {/* タグと統計 */}
          <div className="flex items-center justify-between text-xs">
            {/* タグ */}
            <div className="flex gap-1 overflow-hidden min-w-0">
              {(post.tags || post.tagIds) && (
                <>
                  {/* 新しいtagIds形式のタグ（最初の2つのみ） */}
                  {post.tagIds && post.tagIds.slice(0, 2).map((tagId) => (
                    <TagChip
                      key={`tagid-${tagId}`}
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
                        updatedAt: new Date()
                      }}
                      size="sm"
                      variant="ghost"
                    />
                  ))}
                  
                  {/* 旧しいtags形式のタグ（最初の2つのみ） */}
                  {post.tags && post.tags.slice(0, 2).map((tagName) => (
                    <TagChip
                      key={`tag-${tagName}`}
                      tag={tagName}
                      size="sm"
                      variant="ghost"
                    />
                  ))}
                </>
              )}
            </div>

            {/* お気に入り数 */}
            <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
              <Heart size={10} />
              <span>{post.favoriteCount ?? post.likes ?? 0}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // 縦型レイアウト（デフォルト）
  return (
    <Link href={`/posts/${post.id}`} className={cardClasses}>
      {/* プレビュー画像 */}
      <div className="bg-muted relative overflow-hidden aspect-[5/3] rounded-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <span className="text-muted-foreground font-medium text-xs">
            Canvas
          </span>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-2 space-y-1">
        {/* タイトル */}
        <h3 className="text-foreground line-clamp-2 group-hover:text-primary transition-colors text-sm font-bold">
          {post.title}
        </h3>

        {/* タグ */}
        {(post.tags || post.tagIds) && (
          <div className="flex gap-1 overflow-hidden min-w-0">
            <>
              {/* 新しいtagIds形式のタグ（最初の3つのみ） */}
              {post.tagIds && post.tagIds.slice(0, 3).map((tagId) => (
                <TagChip
                  key={`tagid-${tagId}`}
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
                    updatedAt: new Date()
                  }}
                  size="sm"
                  variant="ghost"
                />
              ))}
              
              {/* 旧しいtags形式のタグ（最初の3つのみ） */}
              {post.tags && post.tags.slice(0, 3).map((tagName) => (
                <TagChip
                  key={`tag-${tagName}`}
                  tag={tagName}
                  size="sm"
                  variant="ghost"
                />
              ))}
            </>
          </div>
        )}

        {/* お気に入り数 */}
        <div className="flex items-center text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1">
            <Heart size={10} />
            <span>{post.favoriteCount ?? post.likes ?? 0}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}