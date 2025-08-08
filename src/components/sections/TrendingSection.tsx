'use client';

import Link from 'next/link';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { BaseCard } from '@/components/ui/BaseCard';
import { HorizontalScrollContainer } from '@/components/ui/HorizontalScrollContainer';
import { Post } from '@/types/Post';

interface TrendingSectionProps {
  posts: Post[];
  loading?: boolean;
}

export function TrendingSection({ posts, loading = false }: TrendingSectionProps) {

  // ヘッダーコンポーネントを共通化
  const renderHeader = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">今週の人気作品</h2>
          <p className="text-muted-foreground">今週投稿の作品ランキング</p>
        </div>
      </div>
      
      {!loading && (
        <Link 
          href="/ranking?period=week"
          className="flex items-center space-x-2 text-primary hover:text-primary/80 font-medium transition-colors group"
        >
          <span>さらに見る</span>
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
      
      {loading && <div className="w-20 h-6 bg-muted animate-pulse rounded"></div>}
    </div>
  );

  if (loading) {
    return (
      <section className="space-y-6">
        {renderHeader()}

        {/* Loading skeleton */}
        <div className="overflow-x-auto">
          <div className="flex gap-4 pb-4 pt-3 px-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-muted animate-pulse rounded-xl h-80 w-72 flex-shrink-0"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const trendingPosts = posts.slice(0, 10);

  return (
    <section className="space-y-6">
      {/* Header */}
      {renderHeader()}

      {/* Grid */}
      {/* 大画面：矢印ボタン付きスクロールカード */}
      <div className="hidden md:block">
        <HorizontalScrollContainer dependencies={[trendingPosts]}>
          <div className="flex gap-4 pb-4 pt-3 px-3">
            {trendingPosts.map((post, index) => (
              <div key={post.id} className="w-72 flex-shrink-0">
                <BaseCard 
                  post={post} 
                  size="medium"
                  showViews={false}
                  showCategory={false}
                  rank={index + 1}
                />
              </div>
            ))}
          </div>
        </HorizontalScrollContainer>
      </div>

      {/* 小画面：横長リスト */}
      <div className="md:hidden space-y-3">
        {trendingPosts.map((post, index) => (
          <BaseCard 
            key={post.id}
            post={post} 
            size="medium"
            layout="horizontal"
            showViews={false}
            showCategory={false}
            rank={index + 1}
          />
        ))}
      </div>

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