'use client';

import { useState, useRef, useEffect } from 'react';
import { Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { BaseCard } from '@/components/ui/BaseCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TopicHighlight } from '@/types/Topic';

interface TopicHighlightSectionProps {
  topicHighlights: TopicHighlight[];
  loading?: boolean;
}

export function TopicHighlightSection({ topicHighlights, loading = false }: TopicHighlightSectionProps) {
  // すべての投稿を1つの配列にまとめる
  const allPosts = topicHighlights.flatMap(highlight => highlight.featuredPosts);
  
  // スクロール制御
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const cardWidth = 288; // w-72 = 288px
      const gap = 24; // gap-6 = 24px
      scrollContainerRef.current.scrollBy({
        left: -(cardWidth + gap) * 2,
        behavior: 'smooth'
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const cardWidth = 288; // w-72 = 288px
      const gap = 24; // gap-6 = 24px
      scrollContainerRef.current.scrollBy({
        left: (cardWidth + gap) * 2,
        behavior: 'smooth'
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  // 初期化時にスクロールボタンの状態をチェック
  useEffect(() => {
    const timer = setTimeout(checkScrollButtons, 100);
    return () => clearTimeout(timer);
  }, [allPosts]);

  // ウィンドウリサイズ時にスクロールボタンの状態を更新
  useEffect(() => {
    const handleResize = () => {
      checkScrollButtons();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // データがない場合でもヘッダーは表示する
  // if (allPosts.length === 0) {
  //   return null;
  // }

  return (
    <section className="space-y-6">
      {/* Header */}
      <SectionHeader
        icon={Tag}
        iconGradient={{ from: 'green-500', to: 'blue-500' }}
        title="今週のおすすめ"
        titleSize="lg"
        description="注目のジャンル・タグ"
        loading={loading}
      />

      {/* 矢印付き横スクロールリスト */}
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
        {/* 左矢印 */}
        {canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border border-border rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-105"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        
        {/* 右矢印 */}
        {canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border border-border rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-105"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* スクロールコンテナ */}
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide"
          onScroll={checkScrollButtons}
        >
          <div className="flex gap-6 pb-4 px-4 sm:px-6 lg:px-8 min-w-max">
            {allPosts.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                データを読み込み中...
              </div>
            ) : (
              topicHighlights.map((highlight) => (
                <div key={highlight.topic.id} className="flex flex-col gap-4">
                  {/* 副タイトル */}
                  <h3 className="text-lg font-semibold text-foreground px-2">
                    {highlight.topic.name}
                  </h3>
                  
                  {/* この副タイトルに属する作品群 */}
                  <div className="flex gap-6">
                    {highlight.featuredPosts.map((post) => (
                      <div key={post.id} className="w-72 flex-shrink-0">
                        <BaseCard 
                          post={post}
                          size="medium"
                          layout="vertical"
                          showViews={false}
                          showCategory={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}