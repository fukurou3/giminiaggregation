'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { User, LogOut, Plus, Edit3, Search } from 'lucide-react';
import { SearchBar } from './SearchBar';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { loginWithGoogle, logout } from '@/lib/auth';
import { auth } from '@/lib/firebase';
import { Settings } from 'lucide-react';

interface NavbarProps {
  onProfileEdit?: () => void;
}

export function Navbar({ onProfileEdit }: NavbarProps) {
  const { isAuthenticated } = useAuth();
  const { userProfile } = useUserProfile();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('ログインエラー:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const handleProfileEdit = () => {
    setShowUserMenu(false);
    onProfileEdit?.();
  };

  // 管理者権限チェック
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (auth.currentUser) {
        try {
          const idToken = await auth.currentUser.getIdToken();
          const response = await fetch('/api/admin/auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
          });
          
          if (response.ok) {
            const data = await response.json();
            setIsAdmin(data.isAdmin || false);
          }
        } catch (error) {
          console.error('Admin check error:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    if (isAuthenticated) {
      checkAdminStatus();
    } else {
      setIsAdmin(false);
    }
  }, [isAuthenticated]);

  // クリック外しでメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border py-2 min-[830px]:py-0.5">
      <div className="navbar-container px-2 sm:px-4">
        {/* ロゴエリア */}
        <div className="logo-area">
          <Link href="/" className="text-base sm:text-lg font-bold text-foreground whitespace-nowrap">
            AIアイデア＆試作フォーラム
          </Link>
        </div>

        {/* ナビゲーションエリア（4要素：ランキング/カテゴリ/コラム/検索） */}
        <div className="nav-group">
          <div className="nav-links">
            <Link href="/ranking" className="text-muted-foreground hover:text-foreground transition-colors font-medium whitespace-nowrap">
              ランキング
            </Link>
            <Link href="/categories" className="text-muted-foreground hover:text-foreground transition-colors font-medium whitespace-nowrap">
              カテゴリ
            </Link>
            <Link href="/columns" className="text-muted-foreground hover:text-foreground transition-colors font-medium whitespace-nowrap">
              コラム
            </Link>
          </div>
          <div className="search-area">
            {/* 520px以上で検索バー表示 */}
            <div className="search-wrapper hidden min-[520px]:block">
              <div className="w-full">
                <SearchBar />
              </div>
            </div>
            {/* 520px未満で検索アイコン表示 */}
            <div className="search-icon min-[520px]:hidden">
              <div className="p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer">
                <Search size={18} className="text-muted-foreground hover:text-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* ユーザーエリア */}
        <div className="user-area">
          {isAuthenticated ? (
            <div className="flex items-center space-x-2">
              <Link
                href="/submit"
                className="flex items-center justify-center w-7 h-7 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shrink-0"
              >
                <Plus size={13} />
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 focus:outline-none"
                >
                  {userProfile?.photoURL ? (
                    <div className="w-7 h-7 rounded-full overflow-hidden hover:ring-2 hover:ring-primary/20 transition-all">
                      <Image
                        src={userProfile.photoURL}
                        alt={userProfile.username || 'User'}
                        width={28}
                        height={28}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors">
                      <User size={13} className="text-primary-foreground" />
                    </div>
                  )}
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-1.5 w-40 bg-background border border-border rounded-lg shadow-lg py-1 z-50">
                    <div className="px-2 py-1.5 border-b border-border">
                      <p className="text-xs font-semibold text-foreground">
                        {userProfile?.username || 'ユーザー'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {userProfile?.publicId}
                      </p>
                    </div>
                    <Link
                      href="/mypage"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center space-x-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <User size={13} />
                      <span>マイページ</span>
                    </Link>
                    <button
                      onClick={handleProfileEdit}
                      className="w-full flex items-center space-x-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Edit3 size={13} />
                      <span>プロフィール編集</span>
                    </button>
                    {isAdmin && (
                      <Link
                        href="/secure-dashboard-a8f7k2x9"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full flex items-center space-x-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Settings size={13} />
                        <span>管理画面</span>
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <LogOut size={13} />
                      <span>ログアウト</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-xl font-medium hover:bg-primary/90 transition-colors shrink-0 text-sm"
            >
              アカウント作成・ログイン
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .navbar-container {
          display: grid;
          grid-template-areas: 
            "logo user"
            "nav nav";
          grid-template-columns: 1fr auto;
          gap: 0;
          row-gap: 0.125rem;
          align-items: center;
          min-height: 52px;
        }

        .logo-area {
          grid-area: logo;
          justify-self: start;
          min-height: 2.25rem;
          display: flex;
          align-items: center;
        }

        .nav-group {
          grid-area: nav;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1.25rem;
          min-height: 2.25rem;
        }

        .nav-links {
          display: flex;
          gap: 1.25rem;
        }

        .search-area {
          position: relative;
        }

        .search-wrapper {
          width: 220px; /* 統一された固定幅 */
          flex-shrink: 0;
        }

        .search-wrapper > div {
          max-width: none !important; /* SearchBarのmax-w-xl制限を無効化 */
        }

        .user-area {
          grid-area: user;
          justify-self: end;
          min-height: 2.25rem;
          display: flex;
          align-items: center;
        }

        /* デスクトップレイアウト: 830px以上で1行に */
        @media (min-width: 830px) {
          .navbar-container {
            grid-template-areas: "logo nav user";
            grid-template-columns: minmax(200px, auto) 1fr auto;
            min-height: 52px;
            row-gap: 0;
          }

          .nav-group {
            justify-content: center;
          }

          /* 1行時も同じ幅に統一 */
          .search-wrapper {
            width: 220px; /* 2行時と同じ幅 */
          }
        }

        /* より広い画面での調整 */
        @media (min-width: 1024px) {
          .nav-group {
            gap: 2rem;
          }

          .nav-links {
            gap: 1.5rem;
          }
        }
      `}</style>
    </nav>
  );
}