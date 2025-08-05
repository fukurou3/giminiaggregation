import { createSuccessResponse, createErrorResponse } from '@/lib/api/utils';


export async function POST() {
  try {
    // 本番環境では認証チェックを追加することを推奨
    // const auth = request.headers.get('authorization');
    // if (!auth || auth !== 'Bearer YOUR_SECRET_KEY') {
    //   return createErrorResponse('unauthorized', '認証が必要です', 401);
    // }

    // サンプルコラム作成機能は現在無効化されています
    return createErrorResponse(
      'not_implemented',
      'サンプルコラム作成機能は現在利用できません',
      501
    );

  } catch (error) {
    console.error('Sample column creation error:', error);
    return createErrorResponse(
      'server_error',
      'コラムの作成に失敗しました',
      500
    );
  }
}

// OPTIONS メソッド
export async function OPTIONS() {
  return createSuccessResponse(undefined, undefined, 200);
}