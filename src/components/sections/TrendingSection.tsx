'use client';

import Link from 'next/link';
import { TrendingUp, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { BaseCard } from '@/components/ui/BaseCard';
import { Post } from '@/types/Post';
import { useRef, useState, useEffect } from 'react';

interface TrendingSectionProps {
  posts: Post[];
  loading?: boolean;
}

export function TrendingSection({ posts, loading = false }: TrendingSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const handleResize = () => checkScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [posts]);

  const scrollLeft = () => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const cardWidth = 288 + 16; // カード幅 + gap
      const containerWidth = container.clientWidth;
      const currentScroll = container.scrollLeft;
      
      // 現在表示されているカードの開始位置を計算
      const currentStartIndex = Math.floor(currentScroll / cardWidth);
      const visibleCards = Math.floor(containerWidth / cardWidth);
      
      // 前のページの最初のカードの位置
      const targetIndex = Math.max(0, currentStartIndex - visibleCards);
      const targetScroll = targetIndex * cardWidth;
      
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const cardWidth = 288 + 16; // カード幅 + gap
      const containerWidth = container.clientWidth;
      const currentScroll = container.scrollLeft;
      
      // 現在表示されているカードの開始位置を計算
      const currentStartIndex = Math.floor(currentScroll / cardWidth);
      const visibleCards = Math.floor(containerWidth / cardWidth);
      
      // 次のページの最初のカードの位置
      const targetIndex = currentStartIndex + visibleCards;
      const targetScroll = targetIndex * cardWidth;
      
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">トレンドランキング</h2>
              <p className="text-muted-foreground">人気急上昇中の作品</p>
            </div>
          </div>
          <div className="w-20 h-6 bg-muted animate-pulse rounded"></div>
        </div>

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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">トレンドランキング</h2>
          </div>
        </div>
        
        <Link 
          href="/ranking"
          className="flex items-center space-x-2 text-primary hover:text-primary/80 font-medium transition-colors group"
        >
          <span>さらに見る</span>
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Grid */}
      {/* 大画面：矢印ボタン付きスクロールカード */}
      <div className="hidden md:block">
        <div className="relative">
          {/* 左矢印ボタン */}
          {canScrollLeft && (
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-background border border-border rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          
          {/* 右矢印ボタン */}
          {canScrollRight && (
            <button
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-background border border-border rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
          
          <div 
            ref={scrollRef}
            className="overflow-x-hidden"
            onScroll={checkScrollButtons}
          >
            <div className="flex gap-4 pb-4 pt-3 px-3">
              {trendingPosts.map((post, index) => (
                <div key={post.id} className="relative w-72 flex-shrink-0">
                  {/* Ranking Badge */}
                  <div className="absolute -top-2 -left-2 z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                      'bg-gradient-to-br from-blue-400 to-blue-600'
                    }`}>
                      {index + 1}
                    </div>
                  </div>
                  
                  <BaseCard 
                    post={post} 
                    size="medium"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 小画面：横長リスト */}
      <div className="md:hidden space-y-3">
        {trendingPosts.map((post, index) => (
          <div key={post.id} className="relative">
            {/* Ranking Badge */}
            <div className="absolute -top-1 -left-1 z-10">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                'bg-gradient-to-br from-blue-400 to-blue-600'
              }`}>
                {index + 1}
              </div>
            </div>
            
            <WorkCard 
              post={post} 
              size="medium"
              layout="horizontal"
            />
          </div>
        ))}
      </div>

      {/* Empty State */}
      {trendingPosts.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">まだトレンド作品がありません</h3>
          <p className="text-muted-foreground">素晴らしい作品を投稿して、トレンドを作りましょう！</p>
        </div>
      )}
    </section>
  );
}