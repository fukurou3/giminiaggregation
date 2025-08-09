'use client';

import { Tag } from 'lucide-react';
import { BaseCard } from '@/components/ui/BaseCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HorizontalScrollContainer } from '@/components/ui/HorizontalScrollContainer';
import { TopicHighlight } from '@/types/Topic';

interface TopicHighlightSectionProps {
  topicHighlights: TopicHighlight[];
  loading?: boolean;
}

export function TopicHighlightSection({ topicHighlights, loading = false }: TopicHighlightSectionProps) {
  // すべての投稿を1つの配列にまとめる
  const allPosts = topicHighlights.flatMap(highlight => highlight.featuredPosts);

  const sectionHeader = (
    <SectionHeader
      icon={Tag}
      iconGradient={{ from: 'green-500', to: 'blue-500' }}
      title="今週のおすすめ"
      titleSize="lg"
      description="注目のジャンル・タグ"
      loading={loading}
    />
  );

  if (loading) {
    return (
      <section className="space-y-6">
        {sectionHeader}

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
        {sectionHeader}
        
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
      {sectionHeader}

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