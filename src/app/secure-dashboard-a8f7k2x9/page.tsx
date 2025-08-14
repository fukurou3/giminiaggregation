'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // 未ログインの場合はホームページにリダイレクト
        router.push('/');
        return;
      }
      
      if (!isAdmin) {
        // 管理者でない場合もホームページにリダイレクト
        router.push('/');
        return;
      }
    }
  }, [user, loading, isAdmin, router]);

  // ローディング中またはリダイレクト中
  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証を確認中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">管理者画面</h1>
          <p className="text-gray-600 mt-2">サイトの設定を管理できます</p>
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-700">
              <span className="font-medium">管理者として認証済み:</span> {user.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 今週のおすすめ管理 */}
          <Link
            href="/secure-dashboard-a8f7k2x9/topic-highlights"
            className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 ml-3">今週のおすすめ</h2>
            </div>
            <p className="text-gray-600 text-sm">
              ホーム画面の「今週のおすすめ」セクションの内容を管理
            </p>
          </Link>

          {/* ユーザー通報管理 */}
          <Link
            href="/secure-dashboard-a8f7k2x9/user-reports"
            className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 ml-3">ユーザー通報管理</h2>
            </div>
            <p className="text-gray-600 text-sm">
              ユーザーからの通報を確認・対応
            </p>
          </Link>

          {/* 将来の拡張用 */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 opacity-50">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-500 ml-3">記事管理</h2>
            </div>
            <p className="text-gray-500 text-sm">
              投稿された記事の管理（準備中）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}