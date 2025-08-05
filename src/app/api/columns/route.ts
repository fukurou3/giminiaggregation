import { NextRequest } from 'next/server';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createErrorResponse, createSuccessResponse, getClientIP } from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import type { ColumnSummary } from '@/types/Column';

export async function GET(request: NextRequest) {
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

    // URLパラメータを取得
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const featuredOnly = searchParams.get('featured') === 'true';
    
    // クエリ制限値（デフォルト10、最大50）
    const queryLimit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 10;

    // Firestoreクエリを構築（インデックス不要の簡単なクエリ）
    let columnsQuery;
    
    if (featuredOnly) {
      // 注目記事のみ（orderBy なしで複合インデックス回避）
      columnsQuery = query(
        collection(db, 'columns'),
        where('isPublished', '==', true),
        where('featured', '==', true)
      );
    } else {
      // 通常の公開記事のみ（where のみでインデックス不要）
      columnsQuery = query(
        collection(db, 'columns'),
        where('isPublished', '==', true)
      );
    }

    // 制限を適用
    columnsQuery = query(columnsQuery, limit(queryLimit));

    // データを取得
    const snapshot = await getDocs(columnsQuery);
    
    const columns: ColumnSummary[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        slug: data.slug || '',
        author: data.author || '編集部',
        excerpt: data.excerpt || '',
        coverImage: data.coverImage || undefined,
        category: data.category || 'その他',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || undefined,
        views: data.views || 0,
        likes: data.likes || 0,
        isPublished: data.isPublished || false,
        featured: data.featured || false,
      };
    })
    // クライアント側で日付順にソート（新しい順）
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // ログ出力（監査用）
    console.log(`Columns fetched: ${columns.length} items - IP: ${ip}`);

    return createSuccessResponse(
      { columns, total: columns.length },
      `${columns.length}件のコラムを取得しました`
    );

  } catch (error) {
    console.error('Columns fetch error:', error);
    
    return createErrorResponse(
      'server_error',
      'コラムの取得に失敗しました',
      500
    );
  }
}

// OPTIONS メソッド（プリフライトリクエスト）のハンドリング
export async function OPTIONS() {
  return createSuccessResponse(undefined, undefined, 200);
}