import { NextRequest } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/utils';
import { refreshProfileImageUrlSchema } from '@/lib/schemas/uploadSchema';

import { env } from '@/lib/env';
// Firebase Admin初期化
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: env.GOOGLE_CLOUD_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Google Cloud Storage初期化
const storage = new Storage({
  projectId: env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucket = storage.bucket(env.GOOGLE_CLOUD_STORAGE_BUCKET!);

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse('unauthorized', '認証が必要です', 401);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // リクエストボディの検証
    const body = await request.json();
    const validationResult = refreshProfileImageUrlSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return createErrorResponse(
        'validation_failed',
        '入力データに不備があります',
        400,
        errors
      );
    }

    const { fileName } = validationResult.data;

    // ファイルが存在することを確認
    const gcsFile = bucket.file(fileName);
    const [exists] = await gcsFile.exists();

    if (!exists) {
      return createErrorResponse('not_found', 'ファイルが見つかりません', 404);
    }

    // ファイルのメタデータを確認（アップロードしたユーザーかチェック）
    const [metadata] = await gcsFile.getMetadata();
    if (metadata.metadata?.uploadedBy !== uid) {
      return createErrorResponse('forbidden', 'アクセス権限がありません', 403);
    }

    // 新しい署名付きURLを生成（7日間有効）
    const [signedUrl] = await gcsFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7日後
    });

    return createSuccessResponse({ url: signedUrl });
  } catch (error) {
    console.error('URL refresh error:', error);
    return createErrorResponse(
      'server_error',
      'URL更新に失敗しました',
      500
    );
  }
}
