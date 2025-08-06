import { NextRequest } from 'next/server';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getClientIP
} from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { searchTags } from '@/lib/tags';

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    
    if (!(await checkRateLimit(ip))) {
      return createErrorResponse(
        'rate_limited',
        'リクエストが多すぎます。しばらく待ってからお試しください',
        429
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const limitParam = searchParams.get('limit');
    const queryLimit = limitParam ? Math.min(parseInt(limitParam, 10), 20) : 10;

    if (!q || q.trim().length < 1) {
      return createErrorResponse(
        'invalid_query',
        '検索クエリが必要です',
        400
      );
    }

    const searchTerm = q.trim();
    
    // タグを検索
    const tags = await searchTags(searchTerm, queryLimit);

    return createSuccessResponse(
      { tags },
      `「${searchTerm}」の検索結果: ${tags.length}件のタグが見つかりました`
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