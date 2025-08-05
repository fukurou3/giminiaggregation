import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Firebase Admin初期化
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Google Cloud Storage初期化
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET!);

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

    // リクエストボディからファイル名を取得
    const { fileName } = await request.json();
    
    if (!fileName) {
      return NextResponse.json({ error: 'ファイル名が必要です' }, { status: 400 });
    }

    // ファイルが存在することを確認
    const gcsFile = bucket.file(fileName);
    const [exists] = await gcsFile.exists();
    
    if (!exists) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 404 });
    }

    // ファイルのメタデータを確認（アップロードしたユーザーかチェック）
    const [metadata] = await gcsFile.getMetadata();
    if (metadata.metadata?.uploadedBy !== uid) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
    }

    // 新しい署名付きURLを生成（7日間有効）
    const [signedUrl] = await gcsFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7日後
    });

    return NextResponse.json({
      success: true,
      url: signedUrl,
    });

  } catch (error) {
    console.error('URL refresh error:', error);
    return NextResponse.json(
      { error: 'URL更新に失敗しました' },
      { status: 500 }
    );
  }
}