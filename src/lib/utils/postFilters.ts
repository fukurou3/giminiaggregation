import { Post } from '@/types/Post';

/**
 * 公開設定がtrueまたはundefinedの投稿のみをフィルタリング
 */
export const filterPublicPosts = (posts: Post[]): Post[] => {
  return posts.filter(post => post.isPublic !== false);
};

/**
 * いいね数が0より大きい投稿のみをフィルタリング
 */
export const filterPostsWithLikes = (posts: Post[]): Post[] => {
  return posts.filter(post => {
    const likes = post.favoriteCount ?? post.likes ?? 0;
    return likes > 0;
  });
};

/**
 * 投稿のフィルタリング関数を作成
 * @param includeZeroLikes - true: いいね数0の投稿も含める, false: いいね数0の投稿を除外
 * @returns フィルタ関数
 */
export const createPostFilter = (includeZeroLikes: boolean = false) => {
  return (posts: Post[]): Post[] => {
    const publicPosts = filterPublicPosts(posts);
    return includeZeroLikes ? publicPosts : filterPostsWithLikes(publicPosts);
  };
};

/**
 * いいね数でソートする関数
 * @param posts - ソート対象の投稿配列
 * @param order - 'desc': 降順（デフォルト）, 'asc': 昇順
 * @returns ソート済みの投稿配列
 */
export const sortPostsByLikes = (posts: Post[], order: 'desc' | 'asc' = 'desc'): Post[] => {
  return [...posts].sort((a, b) => {
    const aLikes = a.favoriteCount ?? a.likes ?? 0;
    const bLikes = b.favoriteCount ?? b.likes ?? 0;
    
    // いいね数が異なる場合はいいね数でソート
    if (aLikes !== bLikes) {
      return order === 'desc' ? bLikes - aLikes : aLikes - bLikes;
    }
    
    // いいね数が同じ場合は閲覧数でソート
    const aViews = a.views ?? 0;
    const bViews = b.views ?? 0;
    return order === 'desc' ? bViews - aViews : aViews - bViews;
  });
};;