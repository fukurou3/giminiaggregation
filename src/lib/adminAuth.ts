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