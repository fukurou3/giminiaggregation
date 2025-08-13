/**
 * @/shared/errors.ts の新機能使用例
 * 
 * 従来のAPIは100%互換性を保ちながら、より便利な機能を追加
 */

import { NextRequest } from 'next/server';
import { 
  createErrorResponse,           // 既存のAPI（100%互換）
  createErrorResponseWithHint,   // ヒント付きエラー（新機能）
  createValidationErrorResponse, // バリデーション専用（新機能） 
  CommonErrors                   // ファクトリー関数（新機能）
} from '@/shared/errors';

// === 従来通りの使用方法（変更不要） ===
export function legacyErrorHandling() {
  // これまでのコードは何も変更せずそのまま動作
  return createErrorResponse('invalid_request', 'データが不正です', 400);
}

// === 新機能1: CommonErrorsファクトリー ===
export function modernErrorHandling() {
  // よく使うエラーを簡潔に記述
  const rateLimited = CommonErrors.rateLimited(); // 429
  const unauthorized = CommonErrors.unauthorized(); // 401  
  const serverError = CommonErrors.serverError(); // 500
  const notFound = CommonErrors.notFound(); // 404
  
  // カスタムメッセージも指定可能
  const customUnauth = CommonErrors.unauthorized('このAPIは認証が必要です');
  
  return rateLimited;
}

// === 新機能2: ヒント付きエラーレスポンス ===
export function errorWithHint() {
  // ユーザー向けの具体的なアクションヒントを提供
  return createErrorResponseWithHint(
    'invalid_url',
    'URLの形式が正しくありません',
    'Gemini Canvasの「共有」→「リンクをコピー」から取得したURLを使用してください'
  );
}

// === 新機能3: バリデーション専用エラー ===
export function validationErrors() {
  const errors = [
    { field: 'title', message: 'タイトルは19文字以内で入力してください' },
    { field: 'description', message: '説明は500文字以内で入力してください' },
    { field: 'tags', message: 'タグは1-5個の範囲で選択してください' }
  ];
  
  return createValidationErrorResponse(errors);
}

// === 実用的な使用例：API エンドポイント ===
export async function exampleApiHandler(request: NextRequest) {
  try {
    const body = await request.json();
    
    // バリデーション
    if (!body.title) {
      // 新機能：ヒント付きエラー
      return createErrorResponseWithHint(
        'validation_failed',
        'タイトルが入力されていません',
        '作品の魅力を伝える簡潔なタイトルを入力してください'
      );
    }
    
    // 認証チェック
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      // 新機能：共通エラーファクトリー
      return CommonErrors.unauthorized('ログインして投稿してください');
    }
    
    // 処理成功...
    return Response.json({ success: true });
    
  } catch (error) {
    // 従来通り：既存のAPIがそのまま使用可能
    return createErrorResponse('server_error', '処理中にエラーが発生しました', 500);
  }
}

// === 段階的移行の例 ===
export function gradualMigration() {
  // 段階1: 既存コードはそのまま動作
  const legacy = createErrorResponse('invalid_request', 'エラーです');
  
  // 段階2: 新機能を部分的に採用
  const modern = CommonErrors.invalidRequest('より詳細なエラーメッセージ');
  
  // 段階3: フル活用
  const enhanced = createErrorResponseWithHint(
    'invalid_category', 
    'カテゴリが見つかりません',
    'カテゴリ一覧から適切なカテゴリを選択してください'
  );
  
  return { legacy, modern, enhanced };
}