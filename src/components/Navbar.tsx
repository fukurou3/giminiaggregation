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
    <nav className="sticky top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
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
        /* ① 縦リズムをCSS変数で一元管理 */
        :root {
          --nav-pt: 8px;   /* デフォ外枠: 上 */
          --nav-pb: 8px;   /* デフォ外枠: 下 */
          --row-h: 36px;   /* デフォ行高 (2行時) */
          --row-gap: 4px;  /* 2行の行間 */
          --search-w: 200px;
        }

        /* 1行時（>=830px）は少し薄く */
        @media (min-width: 830px) {
          :root {
            --nav-pt: 12px;
            --nav-pb: 12px;
            --row-h: 44px;   /* 1行時はやや高めでバランス確保 */
            --row-gap: 0px;  /* 1行なので行間なし */
          }
        }

        /* 外枠パディングを変数で */
        nav :global(.navbar-container) {
          padding-top: var(--nav-pt);
          padding-bottom: var(--nav-pb);
        }

        .navbar-container {
          display: grid;
          grid-template-areas:
            "logo user"
            "nav nav";
          grid-template-columns: 1fr auto;
          /* ② 行高と行間をGrid側で制御（各行min-heightは撤廃） */
          grid-auto-rows: var(--row-h);
          row-gap: var(--row-gap);
          column-gap: 0;
          align-items: center;
        }

        .logo-area,
        .nav-group,
        .user-area {
          /* 行内の縦詰め：余白は外枠とrow-gapに任せる */
          min-height: 0;
          height: var(--row-h);
          display: flex;
          align-items: center;
        }

        .logo-area {
          grid-area: logo;
          justify-self: start;
        }

        .nav-group {
          grid-area: nav;
          justify-content: center;
          gap: 16px; /* 2行時のナカの横間隔 */
        }

        .nav-links { 
          display: flex; 
          gap: 16px; 
        }

        .search-area { 
          position: relative; 
        }
        
        .search-wrapper { 
          width: 200px !important; 
          flex-shrink: 0; 
        }
        
        .search-wrapper > div { 
          max-width: 220px !important;
          width: 220px !important;
        }

        .user-area {
          grid-area: user;
          justify-self: end;
        }

        /* 1行時に並べ替え（既存の830pxブレークポイントに合わせる） */
        @media (min-width: 830px) {
          .navbar-container {
            grid-template-areas: "logo nav user";
            grid-template-columns: minmax(200px, auto) 1fr auto;
          }
          .nav-group { 
            justify-content: center; 
            gap: 24px; 
          }
          .nav-links { 
            gap: 20px; 
          }
        }

        /* ③ タイポグラフィも詰める（任意：小画面でだけ） */
        @media (max-width: 829px) {
          .nav-links a { 
            line-height: 1.2; 
            font-size: 14px; 
          }
        }
      `}</style>
    </nav>
  );
}