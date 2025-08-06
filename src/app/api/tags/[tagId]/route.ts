import { NextRequest } from 'next/server';
import { 
  collection, 
  doc,
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getClientIP
} from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { Tag, TagSearchResult } from '@/types/Tag';
import { Post, Category } from '@/types/Post';
import { CATEGORY_MASTERS, findCategoryById, findCategoryByName } from '@/lib/constants/categories';
import { getTagCategoryStats, updateTagStats } from '@/lib/tags';

export async function GET(
  request: NextRequest,
  { params }: { params: { tagId: string } }
) {
  try {
    const ip = getClientIP(request);
    
    if (!(await checkRateLimit(ip))) {
      return createErrorResponse(
        'rate_limited',
        'リクエストが多すぎます。しばらく待ってからお試しください',
        429
      );
    }

    const { tagId } = params;
    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('category');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const limitParam = searchParams.get('limit');
    const queryLimit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 20;

    // タグ情報を取得
    const tagRef = doc(db, 'tags', tagId);
    const tagDoc = await getDoc(tagRef);
    
    if (!tagDoc.exists()) {
      return createErrorResponse(
        'not_found',
        'タグが見つかりません',
        404
      );
    }

    const tag = { id: tagId, ...tagDoc.data() } as Tag;

    // フラグされたタグは表示しない
    if (tag.flagged) {
      return createErrorResponse(
        'tag_flagged',
        'このタグは利用できません',
        403
      );
    }

    // タグの閲覧数を増加（非同期）
    updateTagStats(tagId, { views: 1 }).catch(console.error);

    // タグを含む投稿を検索
    const postsRef = collection(db, 'posts');
    let postsQuery = query(
      postsRef,
      where('isPublic', '==', true)
    );

    // タグIDで投稿を検索
    // 複合クエリができないため、全件取得後にフィルタリング
    const postsSnapshot = await getDocs(postsQuery);
    
    let matchingPosts = postsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((post: any) => {
        // tagIds配列にtagIdが含まれるかチェック
        return post.tagIds && post.tagIds.includes(tagId);
      }) as Post[];

    // カテゴリフィルタを適用
    if (categoryFilter && categoryFilter !== 'all') {
      matchingPosts = matchingPosts.filter(post => {
        // categoryIdがフィルタと一致するかチェック
        return post.categoryId === categoryFilter;
      });
    }

    // ソート
    matchingPosts.sort((a, b) => {
      switch (sortBy) {
        case 'trending':
          return (b.favoriteCount + b.views) - (a.favoriteCount + a.views);
        case 'views':
          return b.views - a.views;
        case 'favorites':
          return b.favoriteCount - a.favoriteCount;
        case 'createdAt':
        default:
          const aDate = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt as any);
          const bDate = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt as any);
          return bDate.getTime() - aDate.getTime();
      }
    });

    // 制限を適用
    const limitedPosts = matchingPosts.slice(0, queryLimit);

    // カテゴリ別統計を計算
    const categoryStats = CATEGORY_MASTERS.map(category => {
      const count = matchingPosts.filter(post => {
        return post.categoryId === category.id;
      }).length;
      
      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.icon,
        count
      };
    }).filter(stat => stat.count > 0);

    const result: TagSearchResult = {
      tag,
      totalCount: matchingPosts.length,
      categoryStats
    };

    return createSuccessResponse(
      {
        ...result,
        posts: limitedPosts
      },
      `タグ「${tag.name}」の検索結果: ${matchingPosts.length}件`
    );

  } catch (error) {
    console.error('Tag search error:', error);
    
    return createErrorResponse(
      'server_error',
      'タグ検索に失敗しました',
      500
    );
  }
}