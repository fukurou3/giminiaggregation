'use client';

import { Tag } from 'lucide-react';
import { BaseCard } from '@/components/ui/BaseCard';
import { HorizontalScrollContainer } from '@/components/ui/HorizontalScrollContainer';
import { TopicHighlight } from '@/types/Topic';

interface TopicHighlightSectionProps {
  topicHighlights: TopicHighlight[];
  loading?: boolean;
}

export function TopicHighlightSection({ topicHighlights, loading = false }: TopicHighlightSectionProps) {
  // すべての投稿を1つの配列にまとめる
  const allPosts = topicHighlights.flatMap(highlight => highlight.featuredPosts);

  // ヘッダーコンポーネントを共通化
  const renderHeader = () => (
    <div className="flex items-center space-x-3">
      <div className="p-2 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl">
        <Tag className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className={`${loading ? 'text-xl' : 'text-2xl'} font-bold text-foreground`}>今週のおすすめ</h2>
        {loading && <p className="text-muted-foreground">注目のジャンル・タグ</p>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <section className="space-y-6">
        {renderHeader()}

        {/* Loading skeleton */}
        <div className="overflow-x-auto">
          <div className="flex gap-4 pb-4 pt-3 px-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-muted animate-pulse rounded-xl h-80 w-72 flex-shrink-0"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (allPosts.length === 0) {
    return (
      <section className="space-y-6">
        {renderHeader()}
        
        {/* Empty State */}
        <div className="text-center py-12">
          <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">まだおすすめがありません</h3>
          <p className="text-muted-foreground">管理者によるおすすめ作品の設定をお待ちください。</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      {renderHeader()}

      {/* 横スクロールカード - デスクトップのみ */}
      <HorizontalScrollContainer dependencies={[allPosts]}>
        <div className="flex gap-4 pb-4 pt-3 px-3">
          {allPosts.map((post) => (
            <div key={post.id} className="w-72 flex-shrink-0">
              <BaseCard 
                post={post} 
                size="medium"
                showViews={false}
                showCategory={false}
              />
            </div>
          ))}
        </div>
      </HorizontalScrollContainer>
    </section>
  );
}