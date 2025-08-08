import { NextRequest } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import {
  createErrorResponse,
  createSuccessResponse,
  getClientIP,
  CORS_HEADERS,
} from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { logError } from '@/lib/logger';
import { profileImageUploadSchema } from '@/lib/schemas/uploadSchema';
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
    // レート制限チェック
    const ip = getClientIP(request);
    if (!(await checkRateLimit(ip))) {
      return createErrorResponse(
        'rate_limited',
        'リクエストが多すぎます。しばらく待ってからお試しください',
        429
      );
    }

    // 認証チェック
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse('unauthorized', '認証が必要です', 401);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // フォームデータの取得と検証
    const formData = await request.formData();
    const validationResult = profileImageUploadSchema.safeParse({
      file: formData.get('file'),
    });

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

    const { file } = validationResult.data;

    // ファイル名生成
    const fileExtension = file.name.split('.').pop();
    const fileName = `profile-${uid}-${Date.now()}.${fileExtension}`;

    // Google Cloud Storageにアップロード
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const gcsFile = bucket.file(fileName);

    await gcsFile.save(fileBuffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: uid,
          originalName: file.name,
        },
      },
    });

    // 署名付きURLを生成（7日間有効）
    const [signedUrl] = await gcsFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7日後
    });

    return createSuccessResponse({
      url: signedUrl,
      fileName,
    });
  } catch (error) {
    logError(error, { action: 'upload-profile-image' });
    return createErrorResponse(
      'server_error',
      'アップロードに失敗しました',
      500
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
