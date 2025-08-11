'use client';

import { PostGrid } from '@/components/ui/PostGrid';
import { Post } from '@/types/Post';

interface RelatedPostsSectionProps {
  posts: Post[];
  loading?: boolean;
}

export function RelatedPostsSection({ 
  posts, 
  loading = false 
}: RelatedPostsSectionProps) {

  // 最大6件を表示
  const relatedPosts = posts.slice(0, 6);

  return (
    <section className="space-y-6">
      {/* Header - 作品詳細画面の他のタイトルと統一 */}
      <h2 className="text-xl font-bold text-foreground">おすすめの作品</h2>

      {/* PostGrid - TrendingSectionと同じ設定 */}
      <PostGrid
        posts={relatedPosts}
        layout="grid"
        responsive={true}
        showRanking={false}
        showViews={false}
        showCategory={true}
        size="medium"
      />

      {/* Empty State */}
      {relatedPosts.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 text-muted-foreground mx-auto mb-4 flex items-center justify-center">
            <div className="w-8 h-8 bg-muted rounded-full"></div>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">関連作品が見つかりませんでした</h3>
          <p className="text-muted-foreground">まだ関連する作品が投稿されていません</p>
        </div>
      )}
    </section>
  );
}