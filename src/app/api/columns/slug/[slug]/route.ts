import { NextRequest } from 'next/server';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createErrorResponse, createSuccessResponse, getClientIP } from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import type { Column } from '@/types/Column';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
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

    const { slug } = await params;
    if (!slug) {
      return createErrorResponse(
        'invalid_request',
        'コラムのスラッグが指定されていません'
      );
    }

    const q = query(
      collection(db, 'columns'),
      where('slug', '==', slug),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return createErrorResponse(
        'invalid_request',
        '指定されたコラムが見つかりません',
        404
      );
    }

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();

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

    console.log(`Column fetched by slug: ${slug} - IP: ${ip}`);

    return createSuccessResponse(
      { column },
      'コラムを取得しました'
    );
  } catch (error) {
    console.error('Column fetch by slug error:', error);
    return createErrorResponse(
      'server_error',
      'コラムの取得に失敗しました',
      500
    );
  }
}

export async function OPTIONS() {
  return createSuccessResponse(undefined, undefined, 200);
}
