'use client';

import { useState, useEffect } from 'react';
import { 
  Briefcase, 
  GraduationCap, 
  Laptop, 
  Palette, 
  BarChart3, 
  Home, 
  MessageCircle, 
  Bot, 
  Gamepad2, 
  Package,
  Grid3X3
} from 'lucide-react';
import Link from 'next/link';
import { CATEGORY_MASTERS } from '@/lib/constants/categories';
import { useFetch } from '@/lib/api';
import { Post } from '@/types/Post';

// アイコンマッピング（絵文字からLucideアイコンに変換）
const ICON_MAP = {
  '💼': Briefcase,
  '🎓': GraduationCap, 
  '💻': Laptop,
  '🎨': Palette,
  '📊': BarChart3,
  '🏠': Home,
  '💬': MessageCircle,
  '🤖': Bot,
  '🎮': Gamepad2,
  '📦': Package
};

export default function CategoriesListPage() {
  const [categoriesWithCounts, setCategoriesWithCounts] = useState(CATEGORY_MASTERS);

  // 投稿データを取得してカテゴリ別の件数をカウント
  const { data: postsResponse, loading } = useFetch<{
    data?: { posts: Post[] };
  }>('/api/posts?limit=100');

  const posts = postsResponse?.data?.posts || [];

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-4 flex items-center">
              <Grid3X3 className="w-8 h-8 mr-3" />
              カテゴリ一覧
            </h1>
            <p className="text-muted-foreground">
              興味のあるカテゴリを選んで、関連する作品を探してみましょう
            </p>
          </div>

          <div className="grid gap-6 auto-fit-category-list">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-muted animate-pulse rounded-2xl h-48"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4 flex items-center">
            <Grid3X3 className="w-8 h-8 mr-3" />
            カテゴリ一覧
          </h1>
          <p className="text-muted-foreground">
            興味のあるカテゴリを選んで、関連する作品を探してみましょう
          </p>
        </div>

        {/* カテゴリグリッド */}
        <div className="grid gap-6 auto-fit-category-list">
          {categoriesWithCounts.map((category) => {
            const IconComponent = ICON_MAP[category.icon as keyof typeof ICON_MAP] || Package;
            
            return (
              <Link 
                key={category.id}
                href={`/categories?category=${category.id}`}
                className="group bg-card hover:bg-card/80 transition-colors border border-border rounded-2xl p-6 block"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mr-4">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {category.count}作品
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {category.description}
                </p>
              </Link>
            );
          })}
        </div>

        {/* 統計情報 */}
        <div className="mt-12 text-center">
          <div className="bg-muted/50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              登録作品数
            </h2>
            <p className="text-3xl font-bold text-primary">
              {posts.filter(post => post.isPublic !== false).length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              公開中の作品
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}