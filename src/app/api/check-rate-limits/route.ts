import { NextRequest, NextResponse } from 'next/server';
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

// Cloud Functionsのレート制限機能をインポート
import { 
  checkUserDailyLimit, 
  checkIPHourlyLimit,
  getUserUsageStats 
} from '../../../../functions/src/rateLimiter';

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  return 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック（オプショナル - IPレート制限は認証なしでも適用）
    const authHeader = request.headers.get('authorization');
    let uid: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(token);
        uid = decodedToken.uid;
      } catch (authError) {
        console.warn('Auth token verification failed:', authError);
      }
    }

    const { userId, fileCount } = await request.json();
    const ip = getClientIP(request);

    // IPレート制限チェック
    const ipCheck = await checkIPHourlyLimit(ip);
    if (!ipCheck.allowed) {
      return NextResponse.json({
        allowed: false,
        message: `時間当たりのリクエスト制限に達しています。残り時間後に再試行してください。`,
        type: 'ip_limit',
        remaining: ipCheck.remaining
      }, { status: 429 });
    }

    // ユーザーレート制限チェック（ログイン済みの場合）
    if (uid && userId === uid) {
      const userCheck = await checkUserDailyLimit(userId);
      const currentUsage = await getUserUsageStats(userId);
      
      if (!userCheck.allowed || currentUsage.remainingToday < fileCount) {
        return NextResponse.json({
          allowed: false,
          message: `1日の画像アップロード制限に達しています。\n本日の使用量: ${currentUsage.dailyUsage}/${currentUsage.dailyLimit}枚\n明日になると制限がリセットされます。`,
          type: 'user_daily_limit',
          remaining: currentUsage.remainingToday,
          usage: currentUsage
        }, { status: 429 });
      }
    }

    // 制限内の場合
    return NextResponse.json({
      allowed: true,
      message: 'アップロード可能です',
      ipRemaining: ipCheck.remaining,
      userRemaining: uid ? (await getUserUsageStats(userId)).remainingToday : null
    });

  } catch (error) {
    console.error('Rate limit check error:', error);
    
    return NextResponse.json({
      allowed: true, // エラー時はアップロードを許可（フェイルセーフ）
      message: 'レート制限チェックでエラーが発生しましたが、アップロードは継続されます',
      warning: 'Rate limit check failed'
    });
  }
}