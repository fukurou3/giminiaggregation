import { NextRequest } from 'next/server';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getClientIP
} from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { updateTagStats } from '@/lib/tags';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const incrementViews = searchParams.get('incrementViews') === 'true';

    // 投稿を取得
    const postRef = doc(db, 'posts', id);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return createErrorResponse(
        'not_found',
        '投稿が見つかりません',
        404
      );
    }

    const postData = { id, ...postDoc.data() } as { id: string; isPublic?: boolean; views?: number; [key: string]: unknown };

    // 公開投稿のみ表示
    if (!postData.isPublic) {
      return createErrorResponse(
        'forbidden',
        'この投稿は非公開です',
        403
      );
    }

    // 閲覧数を増加（リクエストされた場合）
    if (incrementViews) {
      // 投稿の閲覧数を更新（非同期）
      updateDoc(postRef, {
        views: increment(1)
      }).catch(error => {
        console.warn(`Failed to increment views for post ${id}:`, error);
      });

      // タグの閲覧数を更新（非同期）
      if (postData.tagIds && Array.isArray(postData.tagIds)) {
        postData.tagIds.forEach((tagId: string) => {
          updateTagStats(tagId, { views: 1 }).catch(error => {
            console.warn(`Failed to update tag views for ${tagId}:`, error);
          });
        });
      }

      // レスポンス用にビュー数を事前に増やす
      postData.views = (postData.views || 0) + 1;
    }

    return createSuccessResponse(
      postData,
      '投稿を取得しました'
    );

  } catch (error) {
    console.error('Post fetch error:', error);
    
    return createErrorResponse(
      'server_error',
      '投稿の取得に失敗しました',
      500
    );
  }
}