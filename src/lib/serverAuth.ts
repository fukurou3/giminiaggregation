import { cookies } from 'next/headers';
import admin from 'firebase-admin';
import { env } from './env';

// Firebase Admin SDKの初期化（重複初期化防止）
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
  }
}

export interface ServerAuthUser {
  uid: string;
  email: string;
  isAdmin: boolean;
}

/**
 * サーバーコンポーネント用の管理者認証チェック
 */
export async function checkServerAdmin(): Promise<ServerAuthUser | null> {
  try {
    // 開発環境では管理者として扱う（デバッグ用）
    // サーバーサイドなのでprocess.envは安全に使用可能
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
      return {
        uid: 'dev-admin',
        email: 'dev@example.com',
        isAdmin: true
      };
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    
    if (!token) {
      console.log('No auth token found in cookies');
      return null;
    }

    // Firebase Admin SDKでトークンを検証
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    if (!decodedToken.email) {
      console.log('Token does not contain email');
      return null;
    }

    // 管理者メールアドレスかチェック
    const isAdmin = decodedToken.email === env.ADMIN_EMAIL;
    
    if (!isAdmin) {
      console.log(`User ${decodedToken.email} is not admin. Admin email: ${env.ADMIN_EMAIL}`);
      return null;
    }

    console.log('Server admin authentication successful for:', decodedToken.email);
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      isAdmin: true
    };

  } catch (error) {
    console.error('Server admin authentication error:', error);
    return null;
  }
}

/**
 * サーバーコンポーネント用の一般ユーザー認証チェック
 */
export async function checkServerAuth(): Promise<ServerAuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    
    if (!token) {
      return null;
    }

    // Firebase Admin SDKでトークンを検証
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    if (!decodedToken.email) {
      return null;
    }

    // 管理者権限もチェック
    const isAdmin = decodedToken.email === env.ADMIN_EMAIL;
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      isAdmin
    };

  } catch (error) {
    console.error('Server authentication error:', error);
    return null;
  }
}

/**
 * 管理者かどうかの簡易チェック（boolean返却）
 */
export async function isServerAdmin(): Promise<boolean> {
  const auth = await checkServerAdmin();
  return auth !== null && auth.isAdmin;
}