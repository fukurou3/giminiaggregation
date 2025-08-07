import React, { useState, useMemo } from 'react';
import { Hash, ChevronDown } from 'lucide-react';
import { CategoryCard } from '@/components/ui/CategoryCard';
import { Post, Category } from '@/types/Post';
import { LayoutPhase } from '@/hooks/useResponsiveLayout';

interface CategoryContentProps {
  selectedCategory: string;
  selectedCategoryPosts: Post[];
  categories: Category[];
  layoutPhase: LayoutPhase;
  error: string | null;
  onBackToList?: () => void;
}

export const CategoryContent = React.memo<CategoryContentProps>(function CategoryContent({
  selectedCategory,
  selectedCategoryPosts,
  categories,
  layoutPhase,
  error,
  onBackToList,
}) {
  const [sortBy, setSortBy] = useState<'favorites' | 'createdAt'>('favorites');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const selectedCategoryData = categories.find(cat => cat.name === selectedCategory);

  // ソートされた作品リスト
  const sortedPosts = useMemo(() => {
    return [...selectedCategoryPosts].sort((a, b) => {
      if (sortBy === 'favorites') {
        return (b.favorites || 0) - (a.favorites || 0);
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [selectedCategoryPosts, sortBy]);

  return (
    <>
      {/* Back to Categories List Button */}
      {onBackToList && (
        <button
          onClick={onBackToList}
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 ml-10 mt-1.5 transition-colors"
        >
          <span>カテゴリ一覧に戻る</span>
        </button>
      )}
      
      {/* Header */}
      <header className="mb-8 mt-0">
        {layoutPhase === 'phase4' ? (
          // Mobile layout: Category info positioned relative to external hamburger
          <div className="ml-13">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {selectedCategory}
            </h1>
            <p className="text-muted-foreground">
              {selectedCategoryData?.description}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedCategoryPosts.length} 作品
              </span>
              
              {/* Sort Options - Dropdown */}
              <div className="relative">
                <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between px-4 py-2 text-sm font-medium bg-background border border-border rounded-lg hover:bg-muted transition-colors min-w-[120px]"
              >
                <span>{sortBy === 'favorites' ? '人気順' : '新着順'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      setSortBy('favorites');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors rounded-t-lg ${
                      sortBy === 'favorites' ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    人気順
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('createdAt');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors rounded-b-lg ${
                      sortBy === 'createdAt' ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    新着順
                  </button>
                </div>
              )}
              </div>
            </div>
          </div>
        ) : layoutPhase === 'phase5' ? (
          // Phase5 layout: Category info positioned relative to external hamburger (like mobile but without horizontal list)
          <div className="ml-13">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {selectedCategory}
            </h1>
            <p className="text-muted-foreground">
              {selectedCategoryData?.description}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedCategoryPosts.length} 作品
              </span>
              
              {/* Sort Options - Dropdown */}
              <div className="relative">
                <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between px-4 py-2 text-sm font-medium bg-background border border-border rounded-lg hover:bg-muted transition-colors min-w-[120px]"
              >
                <span>{sortBy === 'favorites' ? '人気順' : '新着順'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      setSortBy('favorites');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors rounded-t-lg ${
                      sortBy === 'favorites' ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    人気順
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('createdAt');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors rounded-b-lg ${
                      sortBy === 'createdAt' ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    新着順
                  </button>
                </div>
              )}
              </div>
            </div>
          </div>
        ) : (
          // Desktop layout: Normal layout
          <>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {selectedCategory}
            </h1>
            <p className="text-muted-foreground">
              {selectedCategoryData?.description}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedCategoryPosts.length} 作品
              </span>
              
              {/* Sort Options - Dropdown */}
              <div className="relative">
                <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between px-4 py-2 text-sm font-medium bg-background border border-border rounded-lg hover:bg-muted transition-colors min-w-[120px]"
              >
                <span>{sortBy === 'favorites' ? '人気順' : '新着順'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      setSortBy('favorites');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors rounded-t-lg ${
                      sortBy === 'favorites' ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    人気順
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('createdAt');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors rounded-b-lg ${
                      sortBy === 'createdAt' ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    新着順
                  </button>
                </div>
              )}
              </div>
            </div>
          </>
        )}
        
        {/* エラー表示 */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm" role="alert">
            エラー: {error}
          </div>
        )}
      </header>

      {/* Category Posts Grid */}
      {sortedPosts.length > 0 ? (
        <>
          {/* Desktop: Auto-fit Grid - Show in Phase 1, 2, 3, 5 */}
          {(layoutPhase !== 'phase4') && (
            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', justifyContent: 'start' }}>
              {sortedPosts.map((post) => (
                <CategoryCard
                  key={post.id}
                  post={post}
                  layout="vertical"
                />
              ))}
            </div>
          )}

          {/* Mobile: Horizontal Layout - Show in Phase 4 only */}
          {layoutPhase === 'phase4' && (
            <div className="space-y-3">
              {sortedPosts.map((post) => (
                <CategoryCard
                  key={post.id}
                  post={post}
                  layout="horizontal"
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <Hash className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            このカテゴリにはまだ作品がありません
          </h3>
          <p className="text-muted-foreground">
            作品が投稿されるとここに表示されます
          </p>
        </div>
      )}
    </>
  );
});