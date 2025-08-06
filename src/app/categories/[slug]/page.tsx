'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Filter, SortDesc } from 'lucide-react';
import { SiteCard } from '@/components/SiteCard';
import { usePostStore } from '@/lib/stores/postStore';
import { useCategoryPosts } from '@/hooks/useCategoryPosts';
import { SortBy } from '@/utils/postSorting';

export default function CategoryDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { posts, categories } = usePostStore();
  
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  // カスタムフックを使用してカテゴリ投稿を取得
  const { categoryName, filteredPosts, categoryDisplayName } = useCategoryPosts({
    posts,
    categorySlug: slug,
    sortBy,
  });

  // カテゴリ情報を取得（メモ化）
  const category = useMemo(() => {
    return categories.find(cat => 
      cat.id === slug || 
      cat.name.toLowerCase() === categoryName.toLowerCase()
    );
  }, [categories, slug, categoryName]);

  const loading = posts.length === 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-4"></div>
            <div className="h-12 bg-muted rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-muted rounded-xl h-80"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayName = category?.name || categoryDisplayName;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/categories"
            className="inline-flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            <span>カテゴリ一覧に戻る</span>
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {displayName}
              </h1>
              <p className="text-muted-foreground">
                {category?.description || 'このカテゴリの作品を表示しています'}
              </p>
              <div className="mt-4 text-sm text-muted-foreground">
                {filteredPosts.length} 作品
              </div>
            </div>
            
            {/* Sort Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <SortDesc size={18} className="text-muted-foreground" />
                <label htmlFor="category-sort-select" className="sr-only">並び順を選択</label>
                <select
                  id="category-sort-select"
                  name="sortBy"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="newest">新着順</option>
                  <option value="popular">人気順</option>
                  <option value="trending">トレンド</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        {filteredPosts.length > 0 ? (
          <div 
            className="grid gap-6"
            style={{ 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              justifyContent: 'start'
            }}
          >
    {filteredPosts.map((post) => (
      <SiteCard key={post.id} post={post} />
    ))}

  </div>
) : (
          <div className="text-center py-16">
            <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              このカテゴリには作品がありません
            </h3>
            <p className="text-muted-foreground mb-6">
              他のカテゴリを探してみるか、新しい作品を投稿してください
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/categories"
                className="inline-flex items-center justify-center px-6 py-3 bg-muted text-foreground font-medium rounded-xl hover:bg-muted/80 transition-colors"
              >
                他のカテゴリを見る
              </Link>
              <Link
                href="/submit"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                作品を投稿する
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}