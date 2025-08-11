import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

export function useProfileLayout() {
  const { layoutPhase, isMobile } = useResponsiveLayout();
  
  const containerClasses = `${
    layoutPhase === 'phase1' ? 'max-w-7xl' : 
    layoutPhase === 'phase2' || layoutPhase === 'phase3' ? 'max-w-6xl' : 
    'w-full'
  } mx-auto px-4 sm:px-6 lg:px-8`;

  return {
    containerClasses,
    isMobile,
    layoutPhase
  };
}