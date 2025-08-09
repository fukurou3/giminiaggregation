'use client';

import { Tag } from 'lucide-react';
import { PostGrid } from '@/components/ui/PostGrid';
import { SectionHeader } from '@/components/ui/SectionHeader';
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

      {/* PostGrid - 統一されたresponsive grid */}
      <PostGrid
        posts={allPosts}
        layout="grid"
        responsive={true}
        showViews={false}
        showCategory={false}
        size="medium"
      />
    </section>
  );
}