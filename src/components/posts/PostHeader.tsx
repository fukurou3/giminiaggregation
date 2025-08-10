'use client';

import { memo } from 'react';
import Link from 'next/link';
import { TagChip } from '@/components/ui/TagChip';
import { PostActions } from './PostActions';
import { findCategoryById } from '@/lib/constants/categories';
import type { Post } from '@/types/Post';

interface PostHeaderProps {
  post: Post;
  isFavorited: boolean;
  isUpdatingFavorite: boolean;
  onFavoriteClick: () => void;
  userLoggedIn: boolean;
}

const getCategoryName = (post: Post): string => {
  const category = post.categoryId ? findCategoryById(post.categoryId) : null;
  return category?.name || post.customCategory || 'その他';
};

const PostHeader = memo<PostHeaderProps>(({ 
  post, 
  isFavorited, 
  isUpdatingFavorite, 
  onFavoriteClick, 
  userLoggedIn 
}) => {
  return (
    <div className="bg-card rounded-xl overflow-hidden">
      <div className="p-3">
        <div className="flex flex-col">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col lg:flex-row lg:items-start gap-3 mb-6">
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-foreground mb-2 leading-tight">
                  {post.title}
                </h1>

                {/* カテゴリとタグ */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <Link 
                    href={`/categories?category=${post.categoryId || 'other'}`}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors cursor-pointer"
                  >
                    {getCategoryName(post)}
                  </Link>
                  {post.tagIds?.map((tagId) => (
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
                      variant="outlined"
                    />
                  ))}
                </div>
              </div>

              {/* アクションボタン */}
              <PostActions
                postUrl={post.url}
                isFavorited={isFavorited}
                isUpdatingFavorite={isUpdatingFavorite}
                onFavoriteClick={onFavoriteClick}
                userLoggedIn={userLoggedIn}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

PostHeader.displayName = 'PostHeader';

export { PostHeader };