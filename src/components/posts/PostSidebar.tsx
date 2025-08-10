'use client';

import { memo } from 'react';
import { Award } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';
import { findCategoryById } from '@/lib/constants/categories';
import type { Post } from '@/types/Post';

interface PostSidebarProps {
  post: Post;
}

const getCategoryName = (post: Post): string => {
  const category = post.categoryId ? findCategoryById(post.categoryId) : null;
  return category?.name || post.customCategory || 'その他';
};

const PostSidebar = memo<PostSidebarProps>(({ post }) => {
  return (
    <div className="space-y-6">
      {/* アプリ情報 */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <h3 className="text-lg font-bold text-foreground mb-4">情報</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">作成者</span>
            <span className="font-medium text-foreground">{post.authorUsername}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">公開日</span>
            <span className="text-foreground">
              {formatDate(post.createdAt, { fallback: '不明' })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">更新日</span>
            <span className="text-foreground">
              {formatDate(post.updatedAt, { fallback: '不明' })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">カテゴリ</span>
            <span className="text-foreground">
              {getCategoryName(post)}
            </span>
          </div>
          {post.featured && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">注目</span>
              <div className="flex items-center text-amber-600">
                <Award size={16} className="mr-1" />
                <span className="font-medium">おすすめ</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

PostSidebar.displayName = 'PostSidebar';

export { PostSidebar };