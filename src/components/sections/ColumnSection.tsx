'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, ArrowRight, ChevronLeft, ChevronRight, Calendar, Eye, Heart, AlertCircle } from 'lucide-react';
import { ColumnSummary } from '@/types/Column';
import { formatDate } from '@/lib/utils/date';
import { useFetch } from '@/lib/api';

interface ColumnSectionProps {
  featuredOnly?: boolean;
  limit?: number;
}

export function ColumnSection({ featuredOnly = false, limit = 10 }: ColumnSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const router = useRouter();

  // APIエンドポイントを構築
  const apiUrl = `/api/columns?limit=${limit}${featuredOnly ? '&featured=true' : ''}`;
  const { data: columnsResponse, loading, error } = useFetch<{
    data?: { columns: ColumnSummary[] };
  }>(apiUrl);

  const columns = columnsResponse?.data?.columns || [];

  // 投稿促進メッセージを擬似コラムとして追加
  const promotionSlide = {
    id: 'promotion',
    title: 'あなたの作品も共有しませんか？',
    excerpt: 'あなたのGemini Canvas作品、ここで紹介してみませんか？投稿は簡単。たくさんの人と楽しさを共有しましょう。',
    category: '投稿募集',
    author: '',
    createdAt: new Date().toISOString(),
    views: 0,
    likes: 0,
    slug: '',
    coverImage: null
  };

  // コラムリストに投稿促進メッセージを追加
  const allSlides = [...columns, promotionSlide];

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || allSlides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % allSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, allSlides.length]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % allSlides.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + allSlides.length) % allSlides.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  // コラムカードクリック処理
  const handleColumnClick = (column: ColumnSummary) => {
    setIsAutoPlaying(false);
    router.push(`/columns/${column.slug}`);
  };

  // エラー表示
  if (error) {
    return (
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">注目コラム</h2>
          </div>
        </div>

        <div className="text-center py-12 bg-muted/50 rounded-2xl border border-destructive/20">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">読み込みエラー</h3>
          <p className="text-muted-foreground mb-4">コラムの読み込みに失敗しました</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            再試行
          </button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">注目コラム</h2>
            </div>
          </div>
          <div className="w-20 h-6 bg-muted animate-pulse rounded"></div>
        </div>

        {/* Loading skeleton */}
        <div className="relative bg-muted animate-pulse rounded-2xl h-80"></div>
      </section>
    );
  }

  if (allSlides.length === 0) {
    return (
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">注目コラム</h2>
          </div>
        </div>

        <div className="text-center py-12 bg-muted/50 rounded-2xl">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">コラムはまだありません</h3>
          <p className="text-muted-foreground">興味深い記事やインタビューをお楽しみに！</p>
        </div>
      </section>
    );
  }

  const currentSlide = allSlides[currentIndex];

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">注目コラム</h2>
          </div>
        </div>
        
        <Link 
          href="/columns"
          className="flex items-center space-x-2 text-primary hover:text-primary/80 font-medium transition-colors group"
        >
          <span>さらに見る</span>
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Carousel */}
      <div className="relative bg-background border border-border rounded-2xl overflow-hidden">
        <div className="relative h-48 md:h-64">
          {/* Background Image */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/60">
            <div 
              className="w-full h-full bg-cover bg-center opacity-20"
              style={{
                backgroundImage: currentSlide.id === 'promotion' 
                  ? 'linear-gradient(to right, rgb(var(--primary)), rgb(var(--secondary)))' 
                  : currentSlide.coverImage 
                    ? `url(${currentSlide.coverImage})` 
                    : 'linear-gradient(to right, rgb(var(--primary)), rgb(var(--secondary)))'
              }}
            />
          </div>

          {/* Content */}
          <div className="relative h-full flex items-center">
            {currentSlide.id === 'promotion' ? (
              <div className="w-full h-full px-8 md:px-12 flex items-center justify-center">
                <div className="text-center max-w-2xl">
                  <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">
                    {currentSlide.title}
                  </h3>
                  <p className="text-muted-foreground text-sm md:text-base mb-6">
                    {currentSlide.excerpt}
                  </p>
                  
                  <div className="flex justify-center gap-4 text-sm">
                    <Link 
                      href="/help" 
                      className="text-blue-500 hover:underline font-medium"
                    >
                      Gemini Canvasとは？
                    </Link>
                    <Link 
                      href="/submit" 
                      className="text-blue-700 hover:underline font-semibold tracking-wide"
                    >
                      今すぐ投稿する
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleColumnClick(currentSlide as ColumnSummary)}
                className="w-full h-full px-8 md:px-12 text-left cursor-pointer group flex items-center"
              >
                <div className="max-w-2xl">


                  {/* Title */}
                  <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4 line-clamp-2">
                    {currentSlide.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-muted-foreground text-sm md:text-base mb-6 line-clamp-3">
                    {currentSlide.excerpt}
                  </p>


                </div>
              </button>
            )}
          </div>

          {/* Navigation Arrows */}
          {allSlides.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 -translate-y-1/2 p-2 transition-colors"
                onMouseEnter={() => setIsAutoPlaying(false)}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 transition-colors"
                onMouseEnter={() => setIsAutoPlaying(false)}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dots Indicator */}
      {allSlides.length > 1 && (
        <div className="flex justify-center space-x-2 pt-4">
          {allSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
              onMouseEnter={() => setIsAutoPlaying(false)}
            />
          ))}
        </div>
      )}



    </section>
  );
}