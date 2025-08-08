'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

export interface UseHorizontalScrollReturn {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  scrollLeft: () => void;
  scrollRight: () => void;
  checkScrollButtons: () => void;
}

/**
 * 横スクロール機能を提供するカスタムフック
 * @param cardWidth - カード1枚の幅（px）
 * @param gap - カード間のギャップ（px）
 * @param dependencies - 再計算のトリガーとなる依存配列
 */
export function useHorizontalScroll(
  cardWidth: number = 288,
  gap: number = 16,
  dependencies: React.DependencyList = []
): UseHorizontalScrollReturn {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollButtons = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1); // 1px の誤差を許容
    }
  }, []);

  const scrollLeft = useCallback(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const totalCardWidth = cardWidth + gap;
      const containerWidth = container.clientWidth;
      const currentScroll = container.scrollLeft;
      
      // 現在表示されているカードの開始位置を計算
      const currentStartIndex = Math.floor(currentScroll / totalCardWidth);
      const visibleCards = Math.floor(containerWidth / totalCardWidth);
      
      // 前のページの最初のカードの位置
      const targetIndex = Math.max(0, currentStartIndex - visibleCards);
      const targetScroll = targetIndex * totalCardWidth;
      
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [cardWidth, gap]);

  const scrollRight = useCallback(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const totalCardWidth = cardWidth + gap;
      const containerWidth = container.clientWidth;
      const currentScroll = container.scrollLeft;
      
      // 現在表示されているカードの開始位置を計算
      const currentStartIndex = Math.floor(currentScroll / totalCardWidth);
      const visibleCards = Math.floor(containerWidth / totalCardWidth);
      
      // 次のページの最初のカードの位置
      const targetIndex = currentStartIndex + visibleCards;
      const targetScroll = targetIndex * totalCardWidth;
      
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [cardWidth, gap]);

  useEffect(() => {
    checkScrollButtons();
    const handleResize = () => checkScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkScrollButtons, ...dependencies]);

  return {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    scrollLeft,
    scrollRight,
    checkScrollButtons
  };
}