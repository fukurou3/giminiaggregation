import { useState, useEffect, useRef } from 'react';
import { LayoutPhase } from './useResponsiveLayout';

interface UseMobileSidebarReturn {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  sidebarRef: React.RefObject<HTMLDivElement | null>;
}

interface UseMobileSidebarProps {
  layoutPhase: LayoutPhase;
  hasCategories: boolean;
  isLoading: boolean;
}

export const useMobileSidebar = ({ 
  layoutPhase, 
  hasCategories, 
  isLoading 
}: UseMobileSidebarProps): UseMobileSidebarReturn => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 横長リスト表示時の初回読み込みでモーダルを自動で開く
  useEffect(() => {
    if ((layoutPhase === 'phase4' || layoutPhase === 'phase5') && !isLoading && hasCategories && isInitialLoad) {
      setIsSidebarOpen(true);
      setIsInitialLoad(false);
    }
  }, [layoutPhase, isLoading, hasCategories, isInitialLoad]);

  // ページアクセス時の処理（上部タブからのアクセスを検出）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (layoutPhase === 'phase4' || layoutPhase === 'phase5')) {
        setIsSidebarOpen(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [layoutPhase]);

  // 右スワイプでカテゴリモーダルを開く（phase4のタッチデバイスのみ）
  useEffect(() => {
    // phase4かつタッチデバイスの場合のみ
    if ((layoutPhase !== 'phase4' && layoutPhase !== 'phase5') || !('ontouchstart' in window)) return;

    let startX = 0;
    let startY = 0;
    const minSwipeDistance = 50;
    const maxVerticalDistance = 100;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = Math.abs(endY - startY);

      // 右スワイプかつ縦方向の動きが少ない場合（画面上のどこからでも）
      if (deltaX > minSwipeDistance && deltaY < maxVerticalDistance) {
        setIsSidebarOpen(true);
      }
    };

    const mainContent = document.querySelector('main') || document.body;
    mainContent.addEventListener('touchstart', handleTouchStart, { passive: true });
    mainContent.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      mainContent.removeEventListener('touchstart', handleTouchStart);
      mainContent.removeEventListener('touchend', handleTouchEnd);
    };
  }, [layoutPhase]);

  // サイドバー外をクリックした時に閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarOpen]);

  return {
    isSidebarOpen,
    setIsSidebarOpen,
    sidebarRef,
  };
};