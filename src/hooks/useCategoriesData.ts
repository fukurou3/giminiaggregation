import { useMemo, useCallback } from 'react';
import { useFetch } from '@/lib/api';
import { Post, Category } from '@/types/Post';
import { CATEGORY_MASTERS } from '@/lib/constants/categories';

interface UseCategoriesDataReturn {
  categories: Category[];
  posts: Post[];
  loading: boolean;
  error: string | null;
  getCategoryCount: (categoryId: string) => number;
  getSelectedCategoryPosts: (selectedCategoryId: string, limit?: number) => Post[];
}

export const useCategoriesData = (): UseCategoriesDataReturn => {
  // API から投稿データを取得
  const { data: postsResponse, loading, error } = useFetch<{
    data?: { posts: Post[] };
  }>('/api/posts?limit=100');

  const posts = postsResponse?.data?.posts || [];

  const categories = useMemo(() => {
    // CATEGORY_MASTERS をベースにして、categoryId を使用
    return CATEGORY_MASTERS.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      icon: cat.icon || '',
      sortOrder: cat.sortOrder || 0
    }));
  }, []);

  // カテゴリごとの作品数を取得（メモ化）- categoryId ベース
  const getCategoryCount = useCallback((categoryId: string): number => {
    return posts.filter(post => post.isPublic !== false && post.categoryId === categoryId).length;
  }, [posts]);

  // 選択されたカテゴリの作品を取得（メモ化）- categoryId ベース
  const getSelectedCategoryPosts = useCallback((selectedCategoryId: string, limit = 20): Post[] => {
    // 空文字列の場合は早期リターン
    if (!selectedCategoryId || selectedCategoryId.trim() === '') {
      return [];
    }
    
    const filteredPosts = posts.filter(post => post.isPublic !== false && post.categoryId === selectedCategoryId);
    
    console.log('getSelectedCategoryPosts Debug:', {
      selectedCategoryId,
      totalPosts: posts.length,
      filteredPosts: filteredPosts.length,
      allCategoryIds: [...new Set(posts.map(p => p.categoryId))],
      samplePost: filteredPosts[0] ? {
        id: filteredPosts[0].id,
        title: filteredPosts[0].title,
        categoryId: filteredPosts[0].categoryId,
        thumbnail: filteredPosts[0].thumbnail
      } : null
    });
    
    return filteredPosts.slice(0, limit);
  }, [posts]);

  return {
    categories,
    posts,
    loading,
    error: typeof error === 'string' ? error : null,
    getCategoryCount,
    getSelectedCategoryPosts,
  };
};;