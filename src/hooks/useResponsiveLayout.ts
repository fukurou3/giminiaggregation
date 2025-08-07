import { useState, useEffect, useCallback } from 'react';

export type LayoutPhase = 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5';

interface LayoutDimensions {
  contentWidth: number | undefined;
  spacerWidth: number | undefined;
}

interface UseResponsiveLayoutReturn {
  layoutPhase: LayoutPhase;
  contentWidth: number | undefined;
  spacerWidth: number | undefined;
}

export const useResponsiveLayout = (): UseResponsiveLayoutReturn => {
  const [layoutPhase, setLayoutPhase] = useState<LayoutPhase>('phase1');
  const [dimensions, setDimensions] = useState<LayoutDimensions>({
    contentWidth: undefined,
    spacerWidth: undefined,
  });

  // Layout constants
  const SIDEBAR_WIDTH = 192; // w-48 = 12rem = 192px
  const MAX_CONTENT_WIDTH = 1280; // max-w-screen-xl
  const MAX_SPACER_WIDTH = 192; // w-48 = 12rem = 192px
  const MOBILE_BREAKPOINT = 680; // カスタムブレークポイント
  const COLLAPSED_SIDEBAR_BREAKPOINT = 830; // サイドバー格納ブレークポイント

  const calculateLayout = useCallback((containerWidth: number) => {
    // Phase 4: Mobile view
    if (containerWidth <= MOBILE_BREAKPOINT) {
      setLayoutPhase('phase4');
      setDimensions({ contentWidth: undefined, spacerWidth: undefined });
      return;
    }

    // Phase 5: Collapsed sidebar view (681px - 810px)
    if (containerWidth <= COLLAPSED_SIDEBAR_BREAKPOINT) {
      setLayoutPhase('phase5');
      setDimensions({ contentWidth: undefined, spacerWidth: undefined });
      return;
    }

    // Calculate collision point
    const collisionWidth = SIDEBAR_WIDTH + MAX_CONTENT_WIDTH + MAX_SPACER_WIDTH;
    
    // Phase 1: Wide screen - everything fits comfortably
    if (containerWidth >= collisionWidth) {
      setLayoutPhase('phase1');
      setDimensions({ contentWidth: undefined, spacerWidth: undefined });
      return;
    }

    // Calculate minimum width needed for content area only (no spacer)
    const minRequiredWidth = SIDEBAR_WIDTH + MAX_CONTENT_WIDTH;
    
    // Phase 2: Collision started - spacer shrinks while content stays fixed
    if (containerWidth >= minRequiredWidth) {
      const calculatedSpacerWidth = containerWidth - SIDEBAR_WIDTH - MAX_CONTENT_WIDTH;
      setLayoutPhase('phase2');
      setDimensions({ 
        contentWidth: MAX_CONTENT_WIDTH, 
        spacerWidth: calculatedSpacerWidth 
      });
      return;
    }

    // Phase 3: Spacer disappeared - content starts shrinking
    const calculatedContentWidth = containerWidth - SIDEBAR_WIDTH;
    setLayoutPhase('phase3');
    setDimensions({ 
      contentWidth: calculatedContentWidth, 
      spacerWidth: 0 
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      calculateLayout(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    
    // Initial calculation
    const timer = setTimeout(() => {
      calculateLayout(window.innerWidth);
    }, 50);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [calculateLayout]);

  return {
    layoutPhase,
    contentWidth: dimensions.contentWidth,
    spacerWidth: dimensions.spacerWidth,
  };
};