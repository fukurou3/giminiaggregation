'use client';

import { memo, useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { convertToCdnUrl } from '@/lib/utils/imageUrlHelpers';

interface ImageGalleryProps {
  // 最新スキーマのみ
  thumbnail: string;
  prImages?: string[];
  title: string;
  className?: string;
}

const ImageGallery = memo<ImageGalleryProps>(({ 
  thumbnail,
  prImages,
  title, 
  className = '' 
}) => {
  // 最新スキーマのみに対応した画像配列の構築
  const buildDisplayImages = () => {
    const allImages: string[] = [];
    
    // サムネイル画像を最初に追加
    allImages.push(thumbnail);
    
    // PR画像を追加
    if (prImages && prImages.length > 0) {
      allImages.push(...prImages);
    }
    
    return allImages;
  };
  
  const displayImages = buildDisplayImages();
  const showNavigation = displayImages.length > 1;
  
  // スクロール管理のstate
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // スクロール状態をチェック
  const checkScrollButtons = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  // スクロール処理
  const scrollLeft = useCallback(() => {
    if (scrollContainerRef.current) {
      const itemWidth = 320 + 16; // w-80 + gap
      scrollContainerRef.current.scrollBy({ 
        left: -itemWidth, 
        behavior: 'smooth' 
      });
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (scrollContainerRef.current) {
      const itemWidth = 320 + 16; // w-80 + gap
      scrollContainerRef.current.scrollBy({ 
        left: itemWidth, 
        behavior: 'smooth' 
      });
    }
  }, []);

  // 初期化とスクロールイベント監視
  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      return () => container.removeEventListener('scroll', checkScrollButtons);
    }
  }, [checkScrollButtons, displayImages]);

  if (displayImages.length === 0) {
    return null;
  }

  return (
    <div className={`bg-card rounded-xl overflow-hidden ${className}`}>
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
        {/* 左矢印 */}
        {showNavigation && canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border border-border rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-105"
            aria-label="前の画像"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        
        {/* 右矢印 */}
        {showNavigation && canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border border-border rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-105"
            aria-label="次の画像"
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
          <div className="flex gap-4 pb-4 px-4 sm:px-6 lg:px-8 min-w-max">
            {/* 先頭に空白を追加 */}
            {displayImages.length > 0 && <div className="w-3 flex-shrink-0" />}
            {displayImages.map((imageUrl, index) => (
              index === 0 ? (
                // サムネイル画像: 固定幅・5:3アスペクト比
                <div key={`${imageUrl}-${index}`} className="w-80 flex-shrink-0">
                  <div className="relative bg-muted rounded-lg overflow-hidden border border-black/20 aspect-[5/3]">
                    <Image
                      src={convertToCdnUrl(imageUrl)}
                      alt={`${title} - 画像 ${index + 1}`}
                      fill
                      loading="lazy"
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                </div>
              ) : (
                // PR画像: 元の比率維持
                <div key={`${imageUrl}-${index}`} className="flex-shrink-0">
                  <div className="h-60 flex items-center">
                    <img
                      src={convertToCdnUrl(imageUrl)}
                      alt={`${title} - 画像 ${index + 1}`}
                      loading="lazy"
                      className="max-h-full w-auto rounded-lg border border-black/20"
                    />
                  </div>
                </div>
              )
            ))}
            {/* 最後尾に空白を追加 */}
            {displayImages.length > 0 && <div className="w-3 flex-shrink-0" />}
          </div>
        </div>
      </div>
    </div>
  );
});

ImageGallery.displayName = 'ImageGallery';

export { ImageGallery };