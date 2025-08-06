'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Menu } from 'lucide-react';
import { CategorySidebar } from '@/components/categories/CategorySidebar';
import { CategoryContent } from '@/components/categories/CategoryContent';
import { CategoriesListView } from '@/components/categories/CategoriesListView';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useCategoriesData } from '@/hooks/useCategoriesData';
import { useMobileSidebar } from '@/hooks/useMobileSidebar';
import { useStickyHeader } from '@/hooks/useStickyHeader';
import { CATEGORY_MASTERS } from '@/lib/constants/categories';

export default function CategoriesPage() {
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoriesWithCounts, setCategoriesWithCounts] = useState(CATEGORY_MASTERS);
  
  // Custom hooks for cleaner component architecture
  const { layoutPhase, contentWidth, spacerWidth } = useResponsiveLayout();
  const { categories, posts, loading, error, getSelectedCategoryPosts } = useCategoriesData();
  
  const { isSidebarOpen, setIsSidebarOpen, sidebarRef } = useMobileSidebar({ 
    layoutPhase, 
    hasCategories: categories.length > 0, 
    isLoading: loading 
  });
  const { isSidebarFixed, sidebarContainerRef } = useStickyHeader({ layoutPhase });
  
  // カテゴリ別の作品数を計算
  useEffect(() => {
    if (posts.length > 0) {
      const updatedCategories = CATEGORY_MASTERS.map(category => {
        const count = posts.filter(post => 
          post.isPublic !== false && 
          post.categoryId === category.id
        ).length;
        
        return {
          ...category,
          count
        };
      });
      
      setCategoriesWithCounts(updatedCategories);
    }
  }, [posts]);
  
  // URLパラメータから選択されたカテゴリを取得
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam && categories.length > 0) {
      const category = categories.find(cat => cat.id === categoryParam);
      if (category) {
        setSelectedCategory(category.name);
      } else {
        // 無効なカテゴリIDの場合はクリア
        setSelectedCategory('');
      }
    } else {
      // categoryパラメータがない場合はカテゴリ一覧表示のためクリア
      setSelectedCategory('');
    }
  }, [searchParams, categories]);

  // カテゴリ選択時の処理
  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setIsSidebarOpen(false);
    // URLを更新（ブラウザ履歴に追加）
    const category = categories.find(cat => cat.name === categoryName);
    if (category) {
      window.history.pushState({}, '', `/categories?category=${category.id}`);
    }
  };

  // カテゴリ一覧に戻る処理
  const handleBackToList = () => {
    setSelectedCategory('');
    window.history.pushState({}, '', '/categories');
  };

  const selectedCategoryPosts = getSelectedCategoryPosts(selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex">
          {/* Left Sidebar - Loading */}
          <div className="w-48 flex-shrink-0">
            <div className="bg-muted animate-pulse h-screen"></div>
          </div>
          {/* Main Content - Loading */}
          <div className="flex-1">
            <div className="max-w-screen-xl mx-auto px-4 py-8">
              <div className="space-y-4 mt-4 md:mt-0">
                <div className="bg-muted animate-pulse rounded-lg h-12 w-1/3"></div>
                <div className="bg-muted animate-pulse rounded-lg h-6 w-1/2"></div>
                <div className="grid gap-6 auto-fit-category-cards">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="bg-muted animate-pulse rounded-xl h-80"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Right Smart Spacer - Loading */}
          <div className="w-48 flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Hamburger Button - Only in Phase 4 and Phase 5 */}
      {(layoutPhase === 'phase4' || layoutPhase === 'phase5') && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-27 left-4 z-40 p-2 hover:bg-muted rounded-md transition-colors"
          aria-label="カテゴリメニューを開く"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile Overlay - Only in Phase 4 and Phase 5 */}
      {(layoutPhase === 'phase4' || layoutPhase === 'phase5') && isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Layout Container */}
      <div className="flex min-w-0 w-full" ref={sidebarContainerRef}>
        {/* Left Sidebar Component */}
        <CategorySidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
          layoutPhase={layoutPhase}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          sidebarRef={sidebarRef}
          isSidebarFixed={isSidebarFixed}
        />

        {/* Layout spacer to prevent content jumping when sidebar becomes fixed */}
        {layoutPhase !== 'phase4' && layoutPhase !== 'phase5' && isSidebarFixed && (
          <div className="w-48 flex-shrink-0" />
        )}

        {/* Main Content - Centered with padding */}
        <main
          style={{
            width: layoutPhase === 'phase2' || layoutPhase === 'phase3' ? 
              (contentWidth ? `${contentWidth}px` : 'auto') : undefined,
            flexGrow: layoutPhase === 'phase1' || layoutPhase === 'phase4' || layoutPhase === 'phase5' ? 1 : 0,
            flexShrink: layoutPhase === 'phase2' ? 0 : 1,
            minWidth: 0
          }}
        >
          <div 
            className={layoutPhase === 'phase1' ? "max-w-screen-xl mx-auto px-4 py-8" : (layoutPhase === 'phase4' || layoutPhase === 'phase5') ? "px-4 pt-8 pb-8" : "px-4 py-8"}
            style={{
              maxWidth: layoutPhase === 'phase1' ? undefined : 'none'
            }}
          >
{selectedCategory ? (
              <CategoryContent
                selectedCategory={selectedCategory}
                selectedCategoryPosts={selectedCategoryPosts}
                categories={categories}
                layoutPhase={layoutPhase}
                error={error}
                onBackToList={handleBackToList}
              />
            ) : (
              <CategoriesListView 
                categories={categoriesWithCounts}
                posts={posts}
                onCategorySelect={handleCategorySelect}
              />
            )}
          </div>
        </main>

        {/* Right Smart Spacer */}
        <div 
          className={(layoutPhase === 'phase4' || layoutPhase === 'phase5') ? "hidden" : ""}
          style={{
            width: layoutPhase === 'phase1' ? '192px' : (spacerWidth !== undefined ? `${spacerWidth}px` : undefined),
            flexShrink: 0,
            display: spacerWidth === 0 ? 'none' : undefined
          }}
        />
      </div>
    </div>
  );
}