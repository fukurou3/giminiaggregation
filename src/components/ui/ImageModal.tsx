'use client';

import { memo, useEffect, useCallback, useState, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { convertToCdnUrl } from '@/lib/utils/imageUrlHelpers';

interface ImageModalProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  title: string;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

const ImageModal = memo<ImageModalProps>(({
  isOpen,
  images,
  currentIndex,
  title,
  onClose,
  onPrevious,
  onNext
}) => {
  // ズーム・パン状態管理
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [lastTouchMidpoint, setLastTouchMidpoint] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // タッチデバイス判定
  const isTouchDevice = useCallback(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // ズーム・パンをリセット
  const resetTransform = useCallback(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }, []);

  // 画像が変更されたときにリセット
  useEffect(() => {
    resetTransform();
  }, [currentIndex, resetTransform]);

  // 2つのタッチポイント間の距離を計算
  const getTouchDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  // 2つのタッチポイントの中点を計算
  const getTouchMidpoint = useCallback((touches: TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }, []);

  // ESCキーでモーダルを閉じる
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (event.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        onPrevious();
        break;
      case 'ArrowRight':
        event.preventDefault();
        onNext();
        break;
    }
  }, [isOpen, onClose, onPrevious, onNext]);

  // タッチスタートハンドラー
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // タッチデバイスでのみ処理を実行
    if (!isTouchDevice()) return;
    
    try {
      e.preventDefault();
    } catch (error) {
      // Passive listenerエラーを無視
    }
    const touches = e.touches;
    
    if (touches.length === 1) {
      // シングルタッチ - ドラッグ開始
      setIsDragging(true);
      setDragStart({
        x: touches[0].clientX - translateX,
        y: touches[0].clientY - translateY
      });
    } else if (touches.length === 2) {
      // ピンチズーム開始
      const distance = getTouchDistance(touches);
      const midpoint = getTouchMidpoint(touches);
      setLastTouchDistance(distance);
      setLastTouchMidpoint(midpoint);
      setIsDragging(false);
    }
  }, [translateX, translateY, getTouchDistance, getTouchMidpoint, isTouchDevice]);

  // タッチムーブハンドラー
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // タッチデバイスでのみ処理を実行
    if (!isTouchDevice()) return;
    
    try {
      e.preventDefault();
    } catch (error) {
      // Passive listenerエラーを無視
    }
    const touches = e.touches;
    
    if (touches.length === 1 && isDragging && scale > 1) {
      // シングルタッチ - ドラッグ
      const newTranslateX = touches[0].clientX - dragStart.x;
      const newTranslateY = touches[0].clientY - dragStart.y;
      
      // 画像の境界制限を適用
      const maxTranslateX = (scale - 1) * 200; // 適切な制限値に調整
      const maxTranslateY = (scale - 1) * 150;
      
      setTranslateX(Math.max(-maxTranslateX, Math.min(maxTranslateX, newTranslateX)));
      setTranslateY(Math.max(-maxTranslateY, Math.min(maxTranslateY, newTranslateY)));
    } else if (touches.length === 2) {
      // ピンチズーム
      const distance = getTouchDistance(touches);
      const midpoint = getTouchMidpoint(touches);
      
      if (lastTouchDistance > 0) {
        const scaleChange = distance / lastTouchDistance;
        const newScale = Math.max(0.5, Math.min(4, scale * scaleChange));
        setScale(newScale);
        
        // ズーム中心点の調整
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          const deltaX = midpoint.x - lastTouchMidpoint.x;
          const deltaY = midpoint.y - lastTouchMidpoint.y;
          setTranslateX(prev => prev + deltaX);
          setTranslateY(prev => prev + deltaY);
        }
      }
      
      setLastTouchDistance(distance);
      setLastTouchMidpoint(midpoint);
    }
  }, [isDragging, scale, dragStart, lastTouchDistance, lastTouchMidpoint, getTouchDistance, getTouchMidpoint, isTouchDevice]);

  // タッチエンドハンドラー
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // タッチデバイスでのみ処理を実行
    if (!isTouchDevice()) return;
    
    try {
      e.preventDefault();
    } catch (error) {
      // Passive listenerエラーを無視
    }
    setIsDragging(false);
    setLastTouchDistance(0);
  }, [isTouchDevice]);

  // ダブルタップでズームリセット
  const handleDoubleClick = useCallback(() => {
    resetTransform();
  }, [resetTransform]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // スクロール防止
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];
  const showNavigation = images.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* モーダルコンテンツ */}
      <div className="relative z-10 max-w-[95vw] max-h-[95vh] flex items-center justify-center">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
          aria-label="閉じる"
        >
          <X size={24} />
        </button>

        {/* 前の画像ボタン */}
        {showNavigation && currentIndex > 0 && (
          <button
            onClick={onPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
            aria-label="前の画像"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* 次の画像ボタン */}
        {showNavigation && currentIndex < images.length - 1 && (
          <button
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
            aria-label="次の画像"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* 画像 */}
        <div 
          ref={containerRef}
          className="relative max-w-full max-h-full overflow-hidden"
          style={{ touchAction: 'none' }}
        >
          <img
            ref={imageRef}
            src={convertToCdnUrl(currentImage)}
            alt={`${title} - 画像 ${currentIndex + 1}`}
            className="max-w-full max-h-[95vh] w-auto h-auto object-contain rounded-lg transition-transform duration-100"
            style={{ 
              maxWidth: '95vw',
              transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
              transformOrigin: 'center center'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
          />
        </div>

        {/* 画像カウンター */}
        {showNavigation && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
});

ImageModal.displayName = 'ImageModal';

export { ImageModal };