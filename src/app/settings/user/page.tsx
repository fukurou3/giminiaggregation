'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, MessageSquare, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface UserNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'report';
  createdAt: any;
  read: boolean;
}

export default function UserSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<UserNotification | null>(null);
  const [activeSection, setActiveSection] = useState<'notifications' | 'logout' | 'delete' | null>('notifications');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // 運営からのお知らせを取得
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error('認証が必要です');
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/users/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('お知らせの取得に失敗しました');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'お知らせの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 通知をクリックして詳細表示＆既読にする
  const handleNotificationClick = async (notification: UserNotification) => {
    setSelectedNotification(notification);
    
    if (!notification.read) {
      await markAsRead(notification.id);
    }
  };

  // 通知を既読にする
  const markAsRead = async (notificationId: string) => {
    try {
      if (!user) return;

      const token = await user.getIdToken();
      await fetch(`/api/users/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('既読更新エラー:', error);
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    try {
      const { logout } = await import('@/lib/auth');
      await logout();
      router.push('/');
    } catch (error) {
      console.error('ログアウトエラー:', error);
      alert('ログアウトに失敗しました');
    }
  };

  // アカウント削除処理
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('確認テキストが一致しません');
      return;
    }

    try {
      setIsDeleting(true);
      
      if (!user) {
        throw new Error('認証が必要です');
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/users/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'アカウント削除に失敗しました');
      }

      const result = await response.json();
      console.log('Account deletion result:', result);

      // 削除成功メッセージを表示
      alert('アカウントが正常に削除されました。ご利用ありがとうございました。');
      
      // ホームページにリダイレクト
      router.push('/');
      
      // 少し待ってからリロード（メッセージが見えるように）
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('アカウント削除エラー:', error);
      alert(error instanceof Error ? error.message : 'アカウント削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (user && activeSection === 'notifications') {
      fetchNotifications();
    }
  }, [user, activeSection]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    
    let date: Date;
    if (timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp && timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return '-';
    }
    
    if (isNaN(date.getTime())) {
      return '-';
    }
    
    return date.toLocaleDateString('ja-JP') + ' ' + date.toLocaleTimeString('ja-JP');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'report':
        return <MessageSquare className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <Bell className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationBg = (type: string, read: boolean) => {
    const opacity = read ? 'bg-opacity-30' : 'bg-opacity-70';
    switch (type) {
      case 'report':
        return `bg-red-50 border-red-200 ${opacity}`;
      case 'warning':
        return `bg-yellow-50 border-yellow-200 ${opacity}`;
      default:
        return `bg-blue-50 border-blue-200 ${opacity}`;
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="戻る"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">ユーザー設定</h1>
        </div>

        {/* 設定メニューと詳細表示 */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* サイドメニュー */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold mb-4">設定項目</h2>
              <nav className="space-y-2">
                <button 
                  onClick={() => setActiveSection('notifications')}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeSection === 'notifications' 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    <span>運営からのお知らせ</span>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveSection('logout')}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeSection === 'logout' 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>ログアウト</span>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveSection('delete')}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeSection === 'delete' 
                      ? 'bg-red-500/10 text-red-600 font-medium' 
                      : 'hover:bg-red-50 text-red-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>退会</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="lg:col-span-2">
            {/* 運営からのお知らせセクション */}
            {activeSection === 'notifications' && (
              <div className="bg-white rounded-lg border border-border p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Bell className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">運営からのお知らせ</h2>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">{error}</p>
                    <button 
                      onClick={fetchNotifications}
                      className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      再読み込み
                    </button>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">運営からのお知らせはありません</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`border rounded-lg p-4 transition-colors cursor-pointer hover:shadow-md ${getNotificationBg(notification.type, notification.read)}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-foreground">
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                                  未読
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message.length > 100 
                                ? `${notification.message.substring(0, 100)}...` 
                                : notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ログアウトセクション */}
            {activeSection === 'logout' && (
              <div className="bg-white rounded-lg border border-border p-6">
                <div className="flex items-center gap-2 mb-6">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <h2 className="text-xl font-semibold">ログアウト</h2>
                </div>

                <div className="space-y-4">
                  <p className="text-gray-600">
                    ログアウトすると、現在のセッションが終了します。再度利用するには、ログインが必要です。
                  </p>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">ログアウト前の確認事項</h3>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• 下書き中の投稿は保存されません</li>
                      <li>• 未送信のメッセージは失われます</li>
                      <li>• 進行中の作業は中断されます</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    ログアウトする
                  </button>
                </div>
              </div>
            )}

            {/* 退会セクション */}
            {activeSection === 'delete' && (
              <div className="bg-white rounded-lg border border-red-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <h2 className="text-xl font-semibold text-red-600">退会</h2>
                </div>

                {!showDeleteConfirm ? (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                      <h3 className="font-semibold text-red-800 mb-2">⚠️ 警告</h3>
                      <p className="text-red-700 text-sm">
                        退会すると、以下のデータがすべて削除され、復元することはできません。
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">削除されるデータ</h3>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li>• プロフィール情報</li>
                        <li>• 投稿したすべての作品</li>
                        <li>• コメントといいね</li>
                        <li>• フォロー/フォロワー情報</li>
                        <li>• その他のアカウント関連データ</li>
                      </ul>
                    </div>

                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                      退会手続きを進める
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-red-100 border border-red-400 rounded-lg p-4">
                      <p className="text-red-800 font-semibold mb-2">
                        本当に退会しますか？
                      </p>
                      <p className="text-red-700 text-sm">
                        この操作は取り消すことができません。
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        確認のため「DELETE」と入力してください
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="DELETE"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        disabled={isDeleting}
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                        disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                      >
                        {isDeleting ? '処理中...' : 'アカウントを削除'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 通知詳細モーダル */}
        {selectedNotification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getNotificationIcon(selectedNotification.type)}
                    <h2 className="text-xl font-semibold">
                      {selectedNotification.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedNotification(null)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="閉じる"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-4">
                    {formatDate(selectedNotification.createdAt)}
                  </p>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-gray-700">
                      {selectedNotification.message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}