'use client';

import React from 'react';
import { 
  Grid3X3, 
  Briefcase, 
  GraduationCap, 
  Laptop, 
  Palette, 
  BarChart3, 
  Home, 
  MessageCircle, 
  Bot, 
  Gamepad2, 
  Package 
} from 'lucide-react';
import type { Post, Category } from '@/types/Post';

// アイコンマッピング
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
} as const;

interface CategoriesListViewProps {
  categories: (Category & { count?: number })[];
  posts: Post[];
  onCategorySelect: (categoryName: string) => void;
}

export const CategoriesListView: React.FC<CategoriesListViewProps> = React.memo(function CategoriesListView({ 
  categories, 
  posts, 
  onCategorySelect 
}) {
  return (
    <div className="space-y-8">
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
        {categories.map((category) => {
          const IconComponent = ICON_MAP[category.icon as keyof typeof ICON_MAP] || Package;
          
          return (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.name)}
              className="group bg-card hover:bg-card/80 transition-colors border border-border rounded-2xl p-6 block text-left w-full"
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
                    {category.count || 0}作品
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {category.description}
              </p>
            </button>
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
  );
});