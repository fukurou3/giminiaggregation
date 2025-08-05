'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { Category } from '@/types/Post';

interface CategoryCardProps {
  category: Category;
  icon: LucideIcon;
}

export function CategoryCard({ category, icon: Icon }: CategoryCardProps) {
  return (
    <Link 
      href={`/categories/${category.id}`}
      className="group block"
    >
      <div className="bg-background border border-border rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 group-hover:border-primary/50 group-hover:-translate-y-1">
        {/* Icon */}
        <div className="mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Icon size={24} className="text-primary-foreground" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
              {category.name}
            </h3>
            <span className="bg-muted text-muted-foreground px-2 py-1 rounded-full text-sm font-medium">
              {category.count}
            </span>
          </div>
          
          {category.description && (
            <p className="text-muted-foreground text-sm line-clamp-2">
              {category.description}
            </p>
          )}
        </div>

        {/* Hover Arrow */}
        <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center text-primary text-sm font-medium">
            <span>カテゴリを見る</span>
            <svg
              className="w-4 h-4 ml-1 transform translate-x-0 group-hover:translate-x-1 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}