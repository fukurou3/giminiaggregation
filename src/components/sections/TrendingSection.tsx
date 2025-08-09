'use client';

import Link from 'next/link';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { PostGrid } from '@/components/ui/PostGrid';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Post } from '@/types/Post';

interface TrendingSectionProps {
  posts: Post[];
  loading?: boolean;
}

export function TrendingSection({ posts, loading = false }: TrendingSectionProps) {

  const rightElement = (
    <Link 
      href="/ranking?period=week"
      className="flex items-center space-x-2 text-primary hover:text-primary/80 font-medium transition-colors group"
    >
      <span>さらに見る</span>
      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
    </Link>
  );

  const trendingPosts = posts.slice(0, 10);

  return (
    <section className="space-y-6">
      {/* Header */}
      <SectionHeader
          icon={TrendingUp}
          iconGradient={{ from: 'orange-500', to: 'red-500' }}
          title="今週の人気作品"
          titleSize="lg"
          description="今週投稿の作品ランキング"
          rightElement={rightElement}
          loading={loading}
        />

      {/* PostGrid - 統一されたresponsive grid */}
      <PostGrid
        posts={trendingPosts}
        layout="grid"
        responsive={true}
        showRanking={true}
        showViews={false}
        showCategory={false}
        size="medium"
      />

      {/* Empty State */}
      {trendingPosts.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">まだトレンド作品がありません</h3>
          <p className="text-muted-foreground">作品のいいね数が不足しています！</p>
        </div>
      )}
    </section>
  );
}