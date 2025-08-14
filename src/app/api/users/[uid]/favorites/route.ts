import { NextRequest } from 'next/server';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
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

    // まず、すべての投稿を取得
    const postsQuery = query(
      collection(db, 'posts'),
      where('isPublic', '==', true)
    );
    
    const postsSnapshot = await getDocs(postsQuery);
    const favoritePostIds: string[] = [];

    // 各投稿でユーザーのお気に入り状態をチェック
    for (const postDoc of postsSnapshot.docs) {
      try {
        const favoriteDoc = await getDoc(doc(db, `posts/${postDoc.id}/favorites/${uid}`));
        if (favoriteDoc.exists()) {
          favoritePostIds.push(postDoc.id);
        }
      } catch (error) {
        console.warn(`Failed to check favorite for post ${postDoc.id}:`, error);
        // 個別エラーは無視して続行
      }
    }

    if (favoritePostIds.length === 0) {
      return createSuccessResponse(
        { favorites: [] },
        'お気に入りした作品はありません'
      );
    }

    // お気に入りした投稿の詳細を取得（既に上でpostsSnapshotから取得済み）
    const favorites = [];
    
    for (const postDoc of postsSnapshot.docs) {
      if (favoritePostIds.includes(postDoc.id)) {
        const postData = postDoc.data();
        
        // 削除された投稿をスキップ
        if (postData.isDeleted === true) {
          continue;
        }
        
        favorites.push({
          id: postDoc.id,
          title: postData.title || '',
          url: postData.url || '',
          description: postData.description || '',
          tagIds: postData.tagIds || [], // tagsからtagIdsに修正
          categoryId: postData.categoryId || '', // categoryからcategoryIdに修正
          customCategory: postData.customCategory || undefined,
          thumbnail: postData.thumbnail || '', // thumbnailUrlからthumbnailに修正
          authorUsername: postData.authorUsername || '匿名ユーザー',
          createdAt: postData.createdAt?.toDate().toISOString() || new Date().toISOString(), // ISO文字列に変換
          updatedAt: postData.updatedAt?.toDate().toISOString() || undefined,
          likes: postData.likes || 0,
          favoriteCount: postData.favoriteCount || 0,
          views: postData.views || 0,
          featured: postData.featured || false,
          ogpTitle: postData.ogpTitle || null,
          ogpDescription: postData.ogpDescription || null,
          ogpImage: postData.ogpImage || null,
        });
      }
    }

    // 作成日時でソート（新しい順）
    favorites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`User favorites fetched: ${favorites.length} items for user ${uid} - IP: ${ip}`);

    return createSuccessResponse(
      { favorites, total: favorites.length },
      `${favorites.length}件のお気に入りを取得しました`
    );

  } catch (error) {
    console.error('User favorites fetch error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      uid
    });
    
    return createErrorResponse(
      'server_error',
      'お気に入りの取得に失敗しました',
      500
    );
  }
}