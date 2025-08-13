import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
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

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'unauthorized', message: '認証が必要です' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const { sessionId, fileName, userId } = await request.json();

    // リクエストユーザーと対象ユーザーが一致するかチェック
    if (uid !== userId) {
      return NextResponse.json(
        { error: 'forbidden', message: '権限がありません' },
        { status: 403 }
      );
    }

    const db = getFirestore();
    
    // 処理済み画像を確認
    const processedQuery = db.collection('processedImages')
      .where('originalPath', '==', `tmp/${sessionId}/${fileName}`)
      .limit(1);
    
    const processedSnapshot = await processedQuery.get();
    
    if (!processedSnapshot.empty) {
      const doc = processedSnapshot.docs[0];
      const data = doc.data();
      
      return NextResponse.json({
        status: 'processed',
        publicUrl: data.publicUrl,
        contentHash: data.contentHash,
        metadata: data.metadata,
        processedAt: data.processedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    }
    
    // 失敗した画像を確認
    const failedQuery = db.collection('failedImages')
      .where('originalPath', '==', `tmp/${sessionId}/${fileName}`)
      .limit(1);
    
    const failedSnapshot = await failedQuery.get();
    
    if (!failedSnapshot.empty) {
      const doc = failedSnapshot.docs[0];
      const data = doc.data();
      
      return NextResponse.json({
        status: 'failed',
        error: data.error,
        failedAt: data.failedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    }
    
    // まだ処理中
    return NextResponse.json({
      status: 'processing',
      message: '画像を処理中です...'
    });

  } catch (error) {
    console.error('Image processing check error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'token_expired', message: '認証トークンが期限切れです' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'internal_error', message: '処理状況の確認に失敗しました' },
      { status: 500 }
    );
  }
}