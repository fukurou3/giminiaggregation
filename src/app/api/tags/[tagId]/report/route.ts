import { NextRequest } from 'next/server';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getClientIP
} from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { reportTag } from '@/lib/tags';

export async function POST(
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
    const body = await request.json();
    
    if (!body.reason || !body.userInfo?.uid) {
      return createErrorResponse(
        'invalid_request',
        '通報理由とユーザー情報が必要です',
        400
      );
    }

    const { reason, userInfo } = body;

    // 有効な通報理由かチェック
    const validReasons = [
      '不適切な内容',
      'スパム・宣伝',
      '誤解を招く内容',
      '著作権侵害',
      'その他'
    ];

    if (!validReasons.includes(reason)) {
      return createErrorResponse(
        'invalid_reason',
        '無効な通報理由です',
        400
      );
    }

    // タグを通報
    await reportTag(tagId, reason, userInfo.uid);

    return createSuccessResponse(
      { success: true },
      'タグの通報を受け付けました。ご協力ありがとうございます。'
    );

  } catch (error) {
    console.error('Tag report error:', error);
    
    return createErrorResponse(
      'server_error',
      'タグ通報に失敗しました',
      500
    );
  }
}