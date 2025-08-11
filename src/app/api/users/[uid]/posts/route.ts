import { NextRequest } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getClientIP 
} from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;
  
  try {
    // IPアドレスを取得してレート制限チェック
    const ip = getClientIP(request);
    
    if (!(await checkRateLimit(ip))) {
      return createErrorResponse(
        'rate_limited',
        'リクエストが多すぎます。しばらく待ってからお試しください',
        429
      );
    }

    if (!uid) {
      return createErrorResponse(
        'invalid_request',
        'ユーザーIDが指定されていません',
        400
      );
    }

    // URLパラメータを取得
    const { searchParams } = new URL(request.url);
    const includePrivate = searchParams.get('includePrivate') === 'true';

    // ユーザーの投稿を取得（orderByを削除してクライアント側でソート）
    let postsQuery;
    
    if (includePrivate) {
      // 非公開投稿も含める（本人のみ）
      postsQuery = query(
        collection(db, 'posts'),
        where('authorId', '==', uid)
      );
    } else {
      // 公開投稿のみ
      postsQuery = query(
        collection(db, 'posts'),
        where('authorId', '==', uid),
        where('isPublic', '==', true)
      );
    }

    const postsSnapshot = await getDocs(postsQuery);
    
    const posts = await Promise.all(
      postsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // シャードからお気に入り数を取得
        const { getFavoriteCount } = await import('@/lib/favorites');
        const actualFavoriteCount = await getFavoriteCount(doc.id);
        
        return {
          id: doc.id,
          title: data.title || '',
          url: data.url || '',
          description: data.description || '',
          tags: data.tags || [],
          tagIds: data.tagIds || [],
          category: data.category || 'その他',
          categoryId: data.categoryId || 'other',
          customCategory: data.customCategory || undefined,
          thumbnailUrl: data.thumbnailUrl || '',
          authorId: data.authorId || '',
          authorUsername: data.authorUsername || '匿名ユーザー',
          authorPublicId: data.authorPublicId || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || undefined,
          likes: data.likes || 0,
          favoriteCount: actualFavoriteCount, // 実際のお気に入り数を使用
          views: data.views || 0,
          featured: data.featured || false,
          isPublic: data.isPublic !== false,
          ogpTitle: data.ogpTitle || null,
          ogpDescription: data.ogpDescription || null,
          ogpImage: data.ogpImage || null,
        };
      })
    )
    // クライアント側でソート（新しい順）
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    console.log(`User posts fetched: ${posts.length} items for user ${uid} - IP: ${ip}`);

    return createSuccessResponse(
      { posts, total: posts.length },
      `${posts.length}件の投稿を取得しました`
    );

  } catch (error) {
    console.error('User posts fetch error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      uid
    });
    
    return createErrorResponse(
      'server_error',
      '投稿の取得に失敗しました',
      500
    );
  }
}