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

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

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

        {/* 設定メニュー */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* サイドメニュー */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold mb-4">設定項目</h2>
              <nav className="space-y-2">
                <button className="w-full text-left p-3 rounded-lg bg-primary/10 text-primary font-medium">
                  運営からのお知らせ
                </button>
                <button className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                  通知設定
                </button>
                <button className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                  プライバシー設定
                </button>
              </nav>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-border p-6">
              <div className="flex items-center gap-2 mb-6">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">運営からのお知らせ</h2>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-600">{error}</p>
                  <button 
                    onClick={fetchNotifications}
                    className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    再読み込み
                  </button>
                </div>
              )}

              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">運営からのお知らせはありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`border rounded-lg p-4 transition-colors cursor-pointer ${getNotificationBg(notification.type, notification.read)}`}
                      onClick={() => markAsRead(notification.id)}
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
                          <p className="text-foreground mb-2 whitespace-pre-wrap">
                            {notification.message}
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
          </div>
        </div>
      </div>
    </div>
  );
}