import { useMemo, useCallback } from 'react';
import { useFetch } from '@/lib/api';
import { Post } from '@/types/Post';
import { CATEGORY_MASTERS, type Category } from '@/lib/constants/categories';

interface UseCategoriesDataReturn {
  categories: Category[];
  posts: Post[];
  loading: boolean;
  error: string | null;
  getCategoryCount: (categoryName: string) => number;
  getSelectedCategoryPosts: (selectedCategory: string, limit?: number) => Post[];
}

export const useCategoriesData = (): UseCategoriesDataReturn => {
  // APIから投稿データを取得
  const { data: postsResponse, loading, error } = useFetch<{
    data?: { posts: Post[] };
  }>('/api/posts?limit=100');

  const posts = postsResponse?.data?.posts || [];

  const categories = useMemo(() => {
    // CATEGORY_MASTERSをベースにして、categoryIdを使用
    return CATEGORY_MASTERS.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description
    }));
  }, []);

  // カテゴリごとの作品数を取得（メモ化）- categoryIdベースに変更
  const getCategoryCount = useCallback((categoryName: string): number => {
    // categoryNameからcategoryIdを逆引き
    const category = CATEGORY_MASTERS.find(cat => cat.name === categoryName);
    if (!category) return 0;
    
    return posts.filter(post => post.isPublic !== false && post.categoryId === category.id).length;
  }, [posts]);

  // 選択されたカテゴリの作品を取得（メモ化）- categoryIdベースに変更
  const getSelectedCategoryPosts = useCallback((selectedCategory: string, limit = 20): Post[] => {
    // categoryNameからcategoryIdを逆引き
    const category = CATEGORY_MASTERS.find(cat => cat.name === selectedCategory);
    if (!category) return [];
    
    return posts
      .filter(post => post.isPublic !== false && post.categoryId === category.id)
      .slice(0, limit);
  }, [posts]);

  return {
    categories,
    posts,
    loading,
    error: typeof error === 'string' ? error : null,
    getCategoryCount,
    getSelectedCategoryPosts,
  };
};