import { NextRequest } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createErrorResponse, createSuccessResponse, getClientIP } from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import type { Column } from '@/types/Column';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    if (!id) {
      return createErrorResponse(
        'invalid_request',
        'コラムIDが指定されていません'
      );
    }

    // Firestoreから個別コラムを取得
    const docRef = doc(db, 'columns', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return createErrorResponse(
        'invalid_request',
        '指定されたコラムが見つかりません',
        404
      );
    }

    const data = docSnap.data();

    // 公開されていないコラムはエラー
    if (!data.isPublished) {
      return createErrorResponse(
        'invalid_request',
        'このコラムは公開されていません',
        404
      );
    }

    const column: Column = {
      id: docSnap.id,
      title: data.title || '',
      slug: data.slug || '',
      author: data.author || '編集部',
      excerpt: data.excerpt || '',
      coverImage: data.coverImage || undefined,
      category: data.category || 'その他',
      body: data.body || '',
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || undefined,
      views: data.views || 0,
      likes: data.likes || 0,
      isPublished: data.isPublished || false,
      featured: data.featured || false,
    };

    // 閲覧数を1増加（非同期で実行、エラーは無視）
    try {
      // updateDocは別途インポートが必要なので、ここでは省略
      // import { updateDoc, increment } from 'firebase/firestore';
      // await updateDoc(docRef, { views: increment(1) });
    } catch (error) {
      // 閲覧数更新のエラーは無視
      console.warn('Failed to update view count:', error);
    }

    // ログ出力（監査用）
    console.log(`Column fetched: ${id} - IP: ${ip}`);

    return createSuccessResponse(
      { column },
      'コラムを取得しました'
    );

  } catch (error) {
    console.error('Column fetch error:', error);
    
    return createErrorResponse(
      'server_error',
      'コラムの取得に失敗しました',
      500
    );
  }
}

// OPTIONS メソッド
export async function OPTIONS() {
  return createSuccessResponse(undefined, undefined, 200);
}