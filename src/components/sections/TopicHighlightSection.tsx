'use client';

import { useRef, useState, useEffect } from 'react';
import { Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { BaseCard } from '@/components/ui/BaseCard';
import { TopicHighlight } from '@/types/Topic';

interface TopicHighlightSectionProps {
  topicHighlights: TopicHighlight[];
  loading?: boolean;
}

export function TopicHighlightSection({ topicHighlights, loading = false }: TopicHighlightSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // すべての投稿を1つの配列にまとめる
  const allPosts = topicHighlights.flatMap(highlight => highlight.featuredPosts);

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
  }, [topicHighlights]);

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
          className="overflow-x-auto scrollbar-hide"
          onScroll={checkScrollButtons}
          style={{
            scrollbarWidth: 'none', /* Firefox */
            msOverflowStyle: 'none',  /* Internet Explorer 10+ */
          }}
        >
          <div className="flex gap-4 pb-4 pt-3 px-3">
            {allPosts.map((post, index) => (
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
        </div>
      </div>
    </section>
  );
}