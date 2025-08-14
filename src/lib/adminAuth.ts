import { NextRequest } from 'next/server';
import admin from 'firebase-admin';
import { env } from './env';

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email || typeof window !== 'undefined') {
    // クライアントサイドでは直接チェックしない
    return false;
  }
  
  return email === env.ADMIN_EMAIL;
}

// サーバーサイドでのみ使用
export function getAdminEmail(): string | null {
  if (typeof window !== 'undefined') {
    return null;
  }
  
  return env.ADMIN_EMAIL || null;
}

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

export interface AdminUser {
  uid: string;
  email: string;
  isAdmin: boolean;
}

export async function authenticateAdmin(request: NextRequest): Promise<AdminUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Invalid or missing auth header');
      return null;
    }

    const idToken = authHeader.substring(7);
    console.log('Verifying token...');
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log('Token verified for user:', decodedToken.email);
    
    // 管理者メールかチェック
    const isAdmin = isAdminEmail(decodedToken.email);
    console.log('Is admin email?', isAdmin, 'Email:', decodedToken.email, 'Admin email:', getAdminEmail());
    
    if (!isAdmin) {
      console.log('User is not admin');
      return null;
    }

    console.log('Admin authentication successful');
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      isAdmin: true
    };
  } catch (error) {
    console.error('Admin authentication error:', error);
    return null;
  }
}