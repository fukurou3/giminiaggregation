import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { env } from '@/lib/env';

// Firebase Admin初期化
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: env.GOOGLE_CLOUD_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY,
    }),
  });
}

// Google Cloud Storage初期化
const storage = new Storage({
  projectId: env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucket = storage.bucket(env.GOOGLE_CLOUD_STORAGE_BUCKET);

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // フォームデータの取得
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 });
    }

    // ファイル検証
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '画像ファイルのみアップロード可能です' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB制限
      return NextResponse.json({ error: 'ファイルサイズは5MB以下にしてください' }, { status: 400 });
    }

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

    return NextResponse.json({
      success: true,
      url: signedUrl,
      fileName,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'アップロードに失敗しました' },
      { status: 500 }
    );
  }
}
