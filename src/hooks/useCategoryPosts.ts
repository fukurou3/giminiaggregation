import { useMemo } from 'react';
import { Post } from '@/types/Post';
import { SortBy, sortPosts } from '@/utils/postSorting';

interface UseCategoryPostsProps {
  posts: Post[];
  categorySlug: string;
  sortBy: SortBy;
}

interface UseCategoryPostsReturn {
  categoryName: string;
  filteredPosts: Post[];
  categoryDisplayName: string;
}

/**
 * スラッグからカテゴリ名を復元
 */
const slugToCategoryName = (slug: string): string => {
  return slug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
};

export const useCategoryPosts = ({ 
  posts, 
  categorySlug, 
  sortBy 
}: UseCategoryPostsProps): UseCategoryPostsReturn => {
  const { categoryName, filteredAndSortedPosts } = useMemo(() => {
    if (!categorySlug) {
      return { categoryName: '', filteredAndSortedPosts: [] };
    }

    // 公開投稿のみフィルタリング
    const publicPosts = posts.filter(post => post.isPublic);
    
    // スラッグからカテゴリ名を復元
    const restoredCategoryName = slugToCategoryName(categorySlug);
    
    // カテゴリに一致する投稿を取得
    const categoryPosts = publicPosts.filter(post => {
      // 直接的なマッチング
      if (post.customCategory === restoredCategoryName) {
        return true;
      }
      
      // スラッグベースのマッチング（フォールバック）
      const postSlug = post.customCategory?.toLowerCase().replace(/\\s+/g, '-');
      return postSlug === categorySlug;
    });

    // ソート処理
    const sortedPosts = sortPosts(categoryPosts, sortBy);

    return {
      categoryName: restoredCategoryName,
      filteredAndSortedPosts: sortedPosts,
    };
  }, [posts, categorySlug, sortBy]);

  return {
    categoryName,
    filteredPosts: filteredAndSortedPosts,
    categoryDisplayName: categoryName || 'カテゴリ',
  };
};