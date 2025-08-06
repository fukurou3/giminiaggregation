import React from 'react';
import { Menu } from 'lucide-react';
import { Category } from '@/hooks/useCategoriesData';
import { LayoutPhase } from '@/hooks/useResponsiveLayout';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryName: string) => void;
  layoutPhase: LayoutPhase;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  sidebarRef: React.RefObject<HTMLDivElement>;
  isSidebarFixed: boolean;
}

export const CategorySidebar = React.memo<CategorySidebarProps>(function CategorySidebar({
  categories,
  selectedCategory,
  onCategorySelect,
  layoutPhase,
  isSidebarOpen,
  setIsSidebarOpen,
  sidebarRef,
  isSidebarFixed,
}) {
  return (
    <div
      ref={sidebarRef}
      className={`
        w-48 flex-shrink-0
        ${(layoutPhase === 'phase4' || layoutPhase === 'phase5')
          ? `fixed z-40 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
          : ''
        }
      `}
      style={{
        display: (layoutPhase === 'phase4' || layoutPhase === 'phase5') ? undefined : 'block',
        position: (layoutPhase === 'phase4' || layoutPhase === 'phase5') ? 'fixed' : (isSidebarFixed ? 'fixed' : 'static'),
        top: (layoutPhase === 'phase4' || layoutPhase === 'phase5') ? '0' : (isSidebarFixed ? '80px' : undefined),
        height: (layoutPhase === 'phase4' || layoutPhase === 'phase5') ? '100vh' : undefined,
        zIndex: (layoutPhase === 'phase4' || layoutPhase === 'phase5') ? 40 : (isSidebarFixed ? 10 : undefined),
      }}
    >
      <div 
        className="bg-background border-r border-border overflow-y-auto h-full relative"
        style={{width: '192px', minWidth: '192px', maxWidth: '192px'}} 
      >
        {/* Fixed Mobile Header - Only in Phase 4 and Phase 5 */}
        {(layoutPhase === 'phase4' || layoutPhase === 'phase5') && (
          <div className="sticky bg-background p-4 z-10" style={{top: '92px'}}>
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-muted rounded-md transition-colors mr-2"
                aria-label="カテゴリメニューを切り替え"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-base font-semibold text-foreground flex items-center">
                カテゴリ
              </h2>
            </div>
          </div>
        )}

        {/* Content wrapper with appropriate padding */}
        <div 
          className={(layoutPhase === 'phase4' || layoutPhase === 'phase5') ? "pt-23 px-3 pb-3" : "px-3 py-8"}
          style={{width: '190px', minWidth: '190px', maxWidth: '190px'}}
        >
          {/* Desktop Header - Show in all phases except mobile */}
          <h2 className={`${(layoutPhase === 'phase4' || layoutPhase === 'phase5') ? 'hidden' : 'block'} text-base font-semibold text-foreground mb-3 flex items-center`}>
            <div className="p-2 mr-2">
              <Menu className="w-5 h-5" />
            </div>
            カテゴリ
          </h2>
        
          <nav className="space-y-1" role="navigation" aria-label="カテゴリ一覧">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategorySelect(category.name)}
                className={`w-full text-left px-2 py-2 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  selectedCategory === category.name
                    ? 'bg-primary/20 text-foreground font-medium'
                    : 'hover:bg-muted text-foreground hover:text-foreground'
                }`}
                aria-current={selectedCategory === category.name ? 'page' : undefined}
              >
                <span>
                  {category.name}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
});