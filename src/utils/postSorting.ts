import { Post } from '@/types/Post';
import { toSafeDate, getDaysDifference } from './dateUtils';

export type SortBy = 'newest' | 'popular' | 'trending';

/**
 * 投稿の人気度スコアを計算
 */
const getPopularityScore = (post: Post): number => {
  return (post.favoriteCount || 0) + (post.views || 0);
};

/**
 * 投稿をソートする
 */
export const sortPosts = (posts: Post[], sortBy: SortBy): Post[] => {
  const sortedPosts = [...posts];
  
  switch (sortBy) {
    case 'popular':
      return sortedPosts.sort((a, b) => getPopularityScore(b) - getPopularityScore(a));
      
    case 'trending': {
      // 30日以内の投稿でフィルタリング
      const recentPosts = sortedPosts.filter(post => {
        const daysDiff = getDaysDifference(toSafeDate(post.createdAt as any));
        return daysDiff <= 30;
      });
      
      // 人気度でソート
      return recentPosts.sort((a, b) => getPopularityScore(b) - getPopularityScore(a));
    }
      
    case 'newest':
    default: {
      return sortedPosts.sort((a, b) => {
        const dateA = toSafeDate(a.createdAt as any);
        const dateB = toSafeDate(b.createdAt as any);
        
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        
        return dateB.getTime() - dateA.getTime();
      });
    }
  }
};