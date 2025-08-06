import { NextRequest } from 'next/server';
import { 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  runTransaction,
  collection,
  getDocs,
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id: postId } = params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return createErrorResponse(
        'invalid_request',
        'ユーザーIDが必要です',
        400
      );
    }

    // 投稿の存在確認
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return createErrorResponse(
        'not_found',
        '投稿が見つかりません',
        404
      );
    }

    const postData = postDoc.data();

    // 公開投稿のみお気に入り可能
    if (!postData.isPublic) {
      return createErrorResponse(
        'forbidden',
        'この投稿はお気に入りできません',
        403
      );
    }

    // お気に入り状態をチェック
    const favoriteRef = doc(db, `posts/${postId}/favorites/${userId}`);
    const favoriteDoc = await getDoc(favoriteRef);
    const isCurrentlyFavorited = favoriteDoc.exists();

    // トランザクションでお気に入り状態を更新
    const result = await runTransaction(db, async (transaction) => {
      if (isCurrentlyFavorited) {
        // お気に入り削除
        transaction.delete(favoriteRef);
        
        // 分散カウンターから減算
        const shardsSnapshot = await getDocs(collection(db, `posts/${postId}/favoriteShards`));
        if (!shardsSnapshot.empty) {
          const randomShard = shardsSnapshot.docs[Math.floor(Math.random() * shardsSnapshot.docs.length)];
          transaction.update(randomShard.ref, { count: increment(-1) });
        }
        
        return { action: 'removed', isFavorited: false };
      } else {
        // お気に入り追加
        transaction.set(favoriteRef, {
          userId,
          createdAt: new Date()
        });
        
        // 分散カウンターに加算
        const shardsSnapshot = await getDocs(collection(db, `posts/${postId}/favoriteShards`));
        if (!shardsSnapshot.empty) {
          const randomShard = shardsSnapshot.docs[Math.floor(Math.random() * shardsSnapshot.docs.length)];
          transaction.update(randomShard.ref, { count: increment(1) });
        }
        
        return { action: 'added', isFavorited: true };
      }
    });

    // タグ統計を更新（非同期）
    if (postData.tagIds && Array.isArray(postData.tagIds)) {
      const increment_count = result.action === 'added' ? 1 : -1;
      postData.tagIds.forEach((tagId: string) => {
        updateTagStats(tagId, { favorites: increment_count }).catch(error => {
          console.warn(`Failed to update tag favorites for ${tagId}:`, error);
        });
      });
    }

    return createSuccessResponse(
      {
        isFavorited: result.isFavorited,
        action: result.action
      },
      result.action === 'added' ? 'お気に入りに追加しました' : 'お気に入りから削除しました'
    );

  } catch (error) {
    console.error('Favorite toggle error:', error);
    
    return createErrorResponse(
      'server_error',
      'お気に入り操作に失敗しました',
      500
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id: postId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return createErrorResponse(
        'invalid_request',
        'ユーザーIDが必要です',
        400
      );
    }

    // お気に入り状態をチェック
    const favoriteRef = doc(db, `posts/${postId}/favorites/${userId}`);
    const favoriteDoc = await getDoc(favoriteRef);
    const isFavorited = favoriteDoc.exists();

    return createSuccessResponse(
      { isFavorited },
      'お気に入り状態を取得しました'
    );

  } catch (error) {
    console.error('Favorite check error:', error);
    
    return createErrorResponse(
      'server_error',
      'お気に入り状態の取得に失敗しました',
      500
    );
  }
}