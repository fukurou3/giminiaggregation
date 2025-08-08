'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useHorizontalScroll } from '@/hooks/useHorizontalScroll';

interface HorizontalScrollContainerProps {
  children: React.ReactNode;
  cardWidth?: number; // カード1枚の幅（px）
  gap?: number; // カード間のギャップ（px）
  className?: string;
  showButtons?: boolean; // 矢印ボタンの表示
  dependencies?: React.DependencyList; // スクロール状態の再計算トリガー
}

/**
 * 横スクロールコンテナコンポーネント
 * - 矢印ボタンによるページング機能
 * - タッチスクロール対応
 * - スクロールバー非表示
 */
export function HorizontalScrollContainer({
  children,
  cardWidth = 288,
  gap = 16,
  className = '',
  showButtons = true,
  dependencies = []
}: HorizontalScrollContainerProps) {
  const { scrollRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight, checkScrollButtons } = 
    useHorizontalScroll(cardWidth, gap, dependencies);

  return (
    <div className={`relative ${className}`}>
      {/* 左矢印ボタン */}
      {showButtons && canScrollLeft && (
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-background border border-border rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="前のページ"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      
      {/* 右矢印ボタン */}
      {showButtons && canScrollRight && (
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-background border border-border rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="次のページ"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
      
      {/* スクロールコンテナ */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide"
        onScroll={checkScrollButtons}
        style={{
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none',  /* Internet Explorer 10+ */
        }}
      >
        {children}
      </div>
    </div>
  );
}