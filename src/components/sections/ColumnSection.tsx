'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, ArrowRight, ChevronLeft, ChevronRight, Calendar, Eye, Heart, AlertCircle } from 'lucide-react';
import { ColumnSummary } from '@/types/Column';
import { formatDate } from '@/lib/utils/date';
import { useColumnStore } from '@/lib/stores/columnStore';

interface ColumnSectionProps {
  featuredOnly?: boolean;
  limit?: number;
}

export function ColumnSection({ featuredOnly = false, limit = 10 }: ColumnSectionProps) {
  const { columns, loading, error, fetchColumns, clearError } = useColumnStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const router = useRouter();

  // データ取得（一時的にfeaturedOnlyを無効化）
  useEffect(() => {
    fetchColumns({ limit, featuredOnly: false });
  }, [fetchColumns, limit]);



  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || columns.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % columns.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, columns.length]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % columns.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + columns.length) % columns.length);
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
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => {
              clearError();
              fetchColumns({ limit, featuredOnly });
            }}
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

  if (columns.length === 0) {
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

  const currentSlideColumn = columns[currentIndex];

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
        <div className="relative h-80 md:h-96">
          {/* Background Image */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/60">
            <div 
              className="w-full h-full bg-cover bg-center opacity-20"
              style={{
                backgroundImage: currentSlideColumn.coverImage 
                  ? `url(${currentSlideColumn.coverImage})` 
                  : 'linear-gradient(to right, rgb(var(--primary)), rgb(var(--secondary)))'
              }}
            />
          </div>

          {/* Content */}
          <div className="relative h-full flex items-center">
            <button
              onClick={() => handleColumnClick(currentSlideColumn)}
              className="w-full h-full px-8 md:px-12 text-left cursor-pointer group"
            >
              <div className="max-w-2xl">
                {/* Category */}
                <div className="inline-block mb-4">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    {currentSlideColumn.category}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4 line-clamp-2">
                  {currentSlideColumn.title}
                </h3>

                {/* Excerpt */}
                <p className="text-muted-foreground text-lg mb-6 line-clamp-3">
                  {currentSlideColumn.excerpt}
                </p>

                {/* Meta Info */}
                <div className="flex items-center space-x-6 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center space-x-1">
                    <Calendar size={16} />
                    <span>{formatDate(currentSlideColumn.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>by</span>
                    <span className="font-medium">{currentSlideColumn.author}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Eye size={16} />
                      <span>{currentSlideColumn.views}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart size={16} />
                      <span>{currentSlideColumn.likes}</span>
                    </div>
                  </div>
                </div>

                {/* Read More Button */}
                {/* クリックして詳細を表示するヒント */}
                <div className="opacity-75 group-hover:opacity-100 transition-opacity">
                  <p className="text-sm text-muted-foreground">
                    📖 クリックして詳細を読む
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Navigation Arrows */}
          {columns.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 hover:bg-background border border-border rounded-full transition-colors"
                onMouseEnter={() => setIsAutoPlaying(false)}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 hover:bg-background border border-border rounded-full transition-colors"
                onMouseEnter={() => setIsAutoPlaying(false)}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Dots Indicator */}
        {columns.length > 1 && (
          <div className="flex justify-center space-x-2 p-4">
            {columns.map((_, index) => (
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
      </div>

      {/* Auto-play indicator */}
      {columns.length > 1 && isAutoPlaying && (
        <div className="text-center">
          <span className="text-xs text-muted-foreground">
            自動再生中 • 3秒ごとに切り替わります
          </span>
        </div>
      )}

    </section>
  );
}