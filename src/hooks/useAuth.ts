import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      setUser(user);
      
      // 管理者権限をチェック
      if (user) {
        try {
          // IDトークンを取得してクッキーに保存
          const idToken = await user.getIdToken();
          document.cookie = `authToken=${idToken}; path=/; secure; samesite=strict; max-age=3600`;
          
          // 開発環境では管理者として扱う
          const isDevelopment = typeof window !== 'undefined' && 
            (window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1');
          
          if (isDevelopment) {
            setIsAdmin(true);
          } else {
            // 本番環境では管理者権限をAPIで確認
            try {
              const response = await fetch('/api/auth/check-admin', {
                headers: {
                  'Authorization': `Bearer ${idToken}`
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                setIsAdmin(data.isAdmin || false);
              } else {
                setIsAdmin(false);
              }
            } catch (error) {
              console.error('Admin check API error:', error);
              setIsAdmin(false);
            }
          }
          
        } catch (error) {
          console.error('Error setting auth cookie:', error);
          setIsAdmin(false);
        }
      } else {
        // ログアウト時はクッキーを削除
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin,
  };
};