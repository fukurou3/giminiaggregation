'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { User, LogOut, Plus, Search } from 'lucide-react';
import { SearchBar } from './SearchBar';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { loginWithGoogle, logout } from '@/lib/auth';
import { auth } from '@/lib/firebase';
import { Settings } from 'lucide-react';
import { getAvatarDisplayUrl, convertToCdnUrl } from '@/lib/utils/imageUrlHelpers';

export function Navbar() {
  const { isAuthenticated } = useAuth();
  const { userProfile } = useUserProfile();
  
  // デバッグ用ログ
  console.log('Navbar userProfile:', userProfile);
  console.log('photoURL:', userProfile?.photoURL);
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
<nav className="navbar sticky top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
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
                        src={getAvatarDisplayUrl(userProfile.photoURL, 'small') || convertToCdnUrl(userProfile.photoURL)}
                        alt={userProfile.username || 'User'}
                        width={28}
                        height={28}
                        className="object-cover w-full h-full"
                        onError={() => console.error('Failed to load profile image:', userProfile.photoURL)}
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
                      href={`/users/${userProfile?.publicId || ''}`}
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center space-x-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <User size={13} />
                      <span>プロフィール</span>
                    </Link>
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
  /* =========================
     TUNING: よく触る数値はここだけ
     ========================= */
  .navbar {
    /* 2行時（< 830px） */
    --nav-pt: 6px;        /* 外枠 上パディング */
    --nav-pb: 10px;        /* 外枠 下パディング */
    --row-h: 30px;        /* 各行の高さ（文字上下の余白感） */
    --row-gap: 5px;       /* 1行目と2行目の間隔 */
    --gap-x: 16px;        /* 2行時：センターの横間隔 */
    --links-gap: 24px;    /* 2行時：リンク同士の間隔 */
    --search-w: 190px;    /* 検索ボックス幅（≥520px） */
    --icon-pad: 8px;      /* 520px未満：検索アイコンの内側余白 */
  }
  @media (min-width: 830px) {
    .navbar {
      /* 1行時（>= 830px） */
      --nav-pt: 7px;     /* ↑ここを増やすと上下が“厚く”なる */
      --nav-pb: 7px;
      --row-h: 44px;      /* 文字上下の余白を増やしたい時はここ */
      --row-gap: 0px;     /* 1行なので 0 のままでOK */
      --gap-x: 24px;      /* 1行時：センターの横間隔 */
      --links-gap: 20px;  /* 1行時：リンク同士の間隔 */
      --search-w: 190px;  /* 1行時：検索ボックス幅 */
      --icon-pad: 8px;    /* 影響なし（1行時はアイコン非表示想定） */
    }
  }

  /* 外枠に縦パディングを適用（JSXのpy-*は使わない） */
  .navbar :global(.navbar-container) {
    padding-top: var(--nav-pt);
    padding-bottom: var(--nav-pb);
  }

  .navbar :global(.navbar-container) {
    display: grid;
    grid-template-areas:
      "logo user"
      "nav nav";
    grid-template-columns: 1fr auto;
    grid-auto-rows: var(--row-h);    /* ← 行の高さはここで一元管理 */
    row-gap: var(--row-gap);         /* ← 行間も変数化 */
    column-gap: 0;
    align-items: center;
  }

  /* 各行のベース：個別min-hは使わない */
  .logo-area,
  .nav-group,
  .user-area {
    min-height: 0;
    height: var(--row-h);
    display: flex;
    align-items: center;
  }

  .logo-area { grid-area: logo; justify-self: start; }
  .user-area { grid-area: user; justify-self: end; }

  /* 中央グループ（ランキング/カテゴリ/コラム/検索） */
  .nav-group {
    grid-area: nav;
    justify-content: center;
    gap: var(--gap-x);
  }
  .nav-links { display: flex; gap: var(--links-gap); }

  .search-area { position: relative; }
  .search-wrapper { width: var(--search-w) !important; flex-shrink: 0; }
  .search-wrapper > div { max-width: calc(var(--search-w) + 20px) !important; width: calc(var(--search-w) + 20px) !important; }

  .search-icon > div { padding: var(--icon-pad); }

  /* 1行レイアウト切替（ブレークポイントは数値の単一ソースに合わせて830pxで統一） */
  @media (min-width: 830px) {
    .navbar :global(.navbar-container) {
      grid-template-areas: "logo nav user";
      grid-template-columns: minmax(200px, auto) 1fr auto;
      row-gap: 0; /* 念のため：1行なので隙間なし */
    }
  }

  /* 小画面のタイポ（任意） */
  @media (max-width: 829px) {
    .nav-links a { line-height: 1.2; font-size: 14px; }
  }
`}</style>

    </nav>
  );
}