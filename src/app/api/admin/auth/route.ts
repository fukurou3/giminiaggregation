import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
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

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json({ error: 'ID token required' }, { status: 400 });
    }

    // Firebase Admin SDKでトークンを検証
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userEmail = decodedToken.email;

    // 管理者メールアドレスかチェック
    const isAdmin = userEmail === env.ADMIN_EMAIL;

    return NextResponse.json({
      isAdmin,
      email: userEmail,
    });

  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}