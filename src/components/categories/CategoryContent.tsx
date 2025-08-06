import React from 'react';
import { Hash } from 'lucide-react';
import { CategoryCard } from '@/components/ui/CategoryCard';
import { Post } from '@/types/Post';
import { Category } from '@/hooks/useCategoriesData';
import { LayoutPhase } from '@/hooks/useResponsiveLayout';

interface CategoryContentProps {
  selectedCategory: string;
  selectedCategoryPosts: Post[];
  categories: Category[];
  layoutPhase: LayoutPhase;
  error: string | null;
}

export const CategoryContent = React.memo<CategoryContentProps>(function CategoryContent({
  selectedCategory,
  selectedCategoryPosts,
  categories,
  layoutPhase,
  error,
}) {
  const selectedCategoryData = categories.find(cat => cat.name === selectedCategory);

  return (
    <>
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
            <div className="mt-4 text-sm text-muted-foreground">
              {selectedCategoryPosts.length} 作品
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
            <div className="mt-4 text-sm text-muted-foreground">
              {selectedCategoryPosts.length} 作品
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
      {selectedCategoryPosts.length > 0 ? (
        <>
          {/* Desktop: Auto-fit Grid - Show in Phase 1, 2, 3 */}
          {layoutPhase !== 'phase4' && (
            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', justifyContent: 'start' }}>
              {selectedCategoryPosts.map((post) => (
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
              {selectedCategoryPosts.map((post) => (
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