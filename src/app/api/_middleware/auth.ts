/**
 * Firebase Auth認証検証ミドルウェア
 * IDトークンの検証とユーザー識別
 */

import { NextRequest } from "next/server";
import admin from "firebase-admin";
import { logEvent, logError } from "@/lib/observability";

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

export interface AuthContext {
  uid: string;
  email?: string;
  verified: boolean;
}

/**
 * Authorization ヘッダーからIDトークンを検証
 * @param request NextJS Request
 * @returns AuthContext または null（未認証）
 */
export async function verifyAuth(request: NextRequest): Promise<AuthContext | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logEvent('auth_missing_header', {
        level: 'warn',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });
      return null;
    }

    const idToken = authHeader.substring(7); // "Bearer " を除去
    
    // Firebase Admin SDKでトークン検証
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    const authContext: AuthContext = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      verified: decodedToken.email_verified || false,
    };

    logEvent('auth_success', {
      uid: authContext.uid,
      email_verified: authContext.verified,
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    return authContext;

  } catch (error) {
    logError(error, {}, {
      operation: 'verifyAuth',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });
    
    return null;
  }
}

/**
 * 認証が必要なAPIのヘルパー関数
 * 未認証の場合はエラーレスポンス用の情報を返す
 */
export async function requireAuth(request: NextRequest): Promise<{
  auth: AuthContext | null;
  error: { status: number; message: string } | null;
}> {
  const auth = await verifyAuth(request);
  
  if (!auth) {
    return {
      auth: null,
      error: {
        status: 401,
        message: "認証が必要です。ログインしてください。"
      }
    };
  }

  return { auth, error: null };
}

export async function authenticateUser(request: NextRequest): Promise<{ user: AuthContext | null }> {
  const auth = await verifyAuth(request);
  return { user: auth };
}