import { useState, useEffect, useRef } from 'react';
import { LayoutPhase } from './useResponsiveLayout';

interface UseStickyHeaderReturn {
  isSidebarFixed: boolean;
  sidebarContainerRef: React.RefObject<HTMLDivElement | null>;
}

interface UseStickyHeaderProps {
  layoutPhase: LayoutPhase;
}

export const useStickyHeader = ({ layoutPhase }: UseStickyHeaderProps): UseStickyHeaderReturn => {
  const [isSidebarFixed, setIsSidebarFixed] = useState(false);
  const sidebarContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Skip on mobile layout
    if (layoutPhase === 'phase4' || layoutPhase === 'phase5') return;

    const HEADER_HEIGHT = 80; // Adjust based on your header height

    const handleScroll = () => {
      if (sidebarContainerRef.current) {
        const { top } = sidebarContainerRef.current.getBoundingClientRect();
        if (top <= HEADER_HEIGHT) {
          setIsSidebarFixed(true);
        } else {
          setIsSidebarFixed(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [layoutPhase]);

  return {
    isSidebarFixed,
    sidebarContainerRef,
  };
};