import { NextRequest } from 'next/server';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getClientIP
} from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { getPopularTags } from '@/lib/tags';

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
    const limitParam = searchParams.get('limit');
    const sortBy = searchParams.get('sortBy') || 'count'; // count, views, favorites, combined
    const queryLimit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 20;

    // 人気タグを取得
    const popularTags = await getPopularTags(100); // 多めに取得してソート

    // ソート方法に応じて並び替え
    popularTags.sort((a, b) => {
      switch (sortBy) {
        case 'views':
          return b.views - a.views;
        case 'favorites':
          return b.favorites - a.favorites;
        case 'combined':
          const aScore = a.views + (a.favorites * 2) + (a.count * 3);
          const bScore = b.views + (b.favorites * 2) + (b.count * 3);
          return bScore - aScore;
        case 'count':
        default:
          return b.count - a.count;
      }
    });

    // 制限を適用
    const limitedTags = popularTags.slice(0, queryLimit);

    return createSuccessResponse(
      { tags: limitedTags },
      `人気タグ ${limitedTags.length}件を取得しました`
    );

  } catch (error) {
    console.error('Popular tags fetch error:', error);
    
    return createErrorResponse(
      'server_error',
      '人気タグの取得に失敗しました',
      500
    );
  }
}