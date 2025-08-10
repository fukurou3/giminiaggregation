'use client';

import { memo } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useImageGallery } from '@/hooks/useImageGallery';

interface ImageGalleryProps {
  images?: string[];
  thumbnailUrl?: string;
  title: string;
  className?: string;
}

const ImageGallery = memo<ImageGalleryProps>(({ 
  images, 
  thumbnailUrl, 
  title, 
  className = '' 
}) => {
  const displayImages = images && images.length > 0 ? images : thumbnailUrl ? [thumbnailUrl] : [];
  const showNavigation = displayImages.length > 1;
  
  const {
    scrollContainerRef,
    canScrollLeft,
    canScrollRight,
    scrollLeft,
    scrollRight,
  } = useImageGallery({ 
    images: displayImages,
    itemWidth: 384, // w-96 = 384px
    gap: 16 // gap-4 = 16px
  });

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
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border border-border rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-105"
            aria-label="前の画像"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        
        {/* 右矢印 */}
        {showNavigation && canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border border-border rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-105"
            aria-label="次の画像"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* スクロールコンテナ */}
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide"
          onScroll={(e) => {
            // スクロール状態をチェックする関数を呼び出し
            if (scrollContainerRef.current) {
              const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
              // この処理はuseImageGallery内で行われるため、ここでは何もしない
            }
          }}
        >
          <div className="flex gap-4 pb-4 px-4 sm:px-6 lg:px-8 min-w-max">
            {displayImages.map((imageUrl, index) => (
              <div key={`${imageUrl}-${index}`} className="w-96 flex-shrink-0">
                <div className="relative aspect-[5/3] bg-muted rounded-lg overflow-hidden border border-black/20">
                  <Image
                    src={imageUrl}
                    alt={`${title} - 画像 ${index + 1}`}
                    fill
                    loading="lazy"
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

ImageGallery.displayName = 'ImageGallery';

export { ImageGallery };