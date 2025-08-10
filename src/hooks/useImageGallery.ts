import { useState, useEffect, useRef } from 'react';

interface UseImageGalleryProps {
  images?: string[];
  itemWidth?: number;
  gap?: number;
}

interface UseImageGalleryReturn {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  scrollLeft: () => void;
  scrollRight: () => void;
}

export const useImageGallery = ({
  images = [],
  itemWidth = 400,
  gap = 16,
}: UseImageGalleryProps = {}): UseImageGalleryReturn => {
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
      scrollContainerRef.current.scrollBy({
        left: -(itemWidth + gap),
        behavior: 'smooth'
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: (itemWidth + gap),
        behavior: 'smooth'
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  // 初期化時にスクロールボタンの状態をチェック
  useEffect(() => {
    if (images.length > 0) {
      const timer = setTimeout(checkScrollButtons, 100);
      return () => clearTimeout(timer);
    }
  }, [images.length]);

  // ウィンドウリサイズ時にスクロールボタンの状態を更新
  useEffect(() => {
    const handleResize = () => {
      checkScrollButtons();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    scrollContainerRef,
    canScrollLeft,
    canScrollRight,
    scrollLeft,
    scrollRight,
  };
};