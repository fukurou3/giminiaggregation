'use client';

import { memo } from 'react';
import { Globe, BarChart3, Users, Zap, Sparkles } from 'lucide-react';
import type { Post } from '@/types/Post';

interface PostContentProps {
  post: Post;
}

const PostContent = memo<PostContentProps>(({ post }) => {
  return (
    <div className="lg:col-span-2 space-y-8">
      {/* 説明セクション */}
      <div className="bg-card rounded-xl p-3">
        <h2 className="text-xl font-bold text-foreground mb-4">説明</h2>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {post.description}
        </p>
      </div>

      {/* 詳細情報（任意項目のみ表示） */}
      {(post.problemBackground || post.useCase || post.uniquePoints || post.futureIdeas) && (
        <div className="bg-card rounded-xl p-3">
          <h2 className="text-xl font-bold text-foreground mb-6">詳細情報</h2>
          <div className="space-y-6">
            {post.problemBackground && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
                  <BarChart3 size={20} className="mr-2 text-blue-600" />
                  課題・背景
                </h3>
                <p className="text-foreground leading-relaxed">{post.problemBackground}</p>
              </div>
            )}
            {post.useCase && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
                  <Users size={20} className="mr-2 text-green-600" />
                  想定シーン・利用者
                </h3>
                <p className="text-foreground leading-relaxed">{post.useCase}</p>
              </div>
            )}
            {post.uniquePoints && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
                  <Zap size={20} className="mr-2 text-purple-600" />
                  差別化ポイント
                </h3>
                <p className="text-foreground leading-relaxed">{post.uniquePoints}</p>
              </div>
            )}
            {post.futureIdeas && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
                  <Sparkles size={20} className="mr-2 text-amber-600" />
                  応用・発展アイデア
                </h3>
                <p className="text-foreground leading-relaxed">{post.futureIdeas}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OGP情報 */}
      {post.ogpTitle && post.ogpTitle !== post.title && (
        <div className="bg-card rounded-xl p-3">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center">
            <Globe size={20} className="mr-2 text-blue-600" />
            Canvas情報
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">タイトル</span>
              <p className="text-foreground">{post.ogpTitle}</p>
            </div>
            {post.ogpDescription && (
              <div>
                <span className="text-sm font-medium text-gray-500">説明</span>
                <p className="text-foreground">{post.ogpDescription}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

PostContent.displayName = 'PostContent';

export { PostContent };