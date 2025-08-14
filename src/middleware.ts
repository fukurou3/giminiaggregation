import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // 管理者画面へのアクセスチェック
  if (request.nextUrl.pathname.startsWith('/secure-dashboard-a8f7k2x9')) {
    try {
      // 開発環境チェック
      const isDevelopment = request.nextUrl.hostname === 'localhost' || 
                           request.nextUrl.hostname === '127.0.0.1';
      
      if (isDevelopment) {
        // 開発環境では通す
        return NextResponse.next();
      }
      
      // 本番環境では認証チェック（簡易実装）
      const authToken = request.cookies.get('authToken')?.value;
      
      if (!authToken) {
        console.log('No auth token found, redirecting to home');
        return NextResponse.redirect(new URL('/', request.url));
      }
      
      // 本番環境での詳細な認証チェックはクライアントサイドで行う
      return NextResponse.next();
      
    } catch (error) {
      console.error('Middleware auth error:', error);
      // エラーが発生した場合もホームページにリダイレクト
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  
  return NextResponse.next();
}

// 一時的に無効化（Webpackエラー回避のため）
export const config = {
  matcher: []
  // matcher: [
  //   '/secure-dashboard-a8f7k2x9/:path*'
  // ]
};