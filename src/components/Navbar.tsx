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
  const [shouldWrap, setShouldWrap] = useState(false);
  const [isVeryNarrow, setIsVeryNarrow] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

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

  // レスポンシブレイアウト管理
  useEffect(() => {
    const checkLayout = () => {
      const screenWidth = window.innerWidth;
      
      // 416px以下かどうかを状態に保存
      setIsVeryNarrow(screenWidth <= 416);
      
      // 416px以下の場合の幅計算
      if (screenWidth <= 416) {
        const logoWidth = 160; // 狭い画面でのロゴ幅
        const navLinksWidth = 180; // ナビリンクの推定幅
        const searchIconWidth = 40; // 検索アイコンの幅
        const userActionsWidth = 60; // ユーザーアクション部分の推定幅
        const minPadding = 8;
        const minGap = 12;
        
        const totalRequiredWidth = logoWidth + navLinksWidth + searchIconWidth + userActionsWidth + minPadding + (minGap * 2);
        setShouldWrap(screenWidth < totalRequiredWidth);
        return;
      }
      
      // 各要素の基本幅を推定
      const logoWidth = 180; // "Canvasアプリ研究所"の推定幅
      const navLinksWidth = 200; // ランキング+カテゴリ+コラムの推定幅
      const searchWidth = screenWidth >= 640 ? 208 : 160; // w-52 (208px) または w-40 (160px)
      const userActionsWidth = 80; // ユーザーアクション部分の推定幅
      
      // 最小余白とギャップ
      const minPadding = screenWidth >= 640 ? 16 : 8; // px-2 または px-1
      const minGap = 20; // 要素間の最小間隔
      
      const totalRequiredWidth = logoWidth + navLinksWidth + searchWidth + userActionsWidth + minPadding + (minGap * 2);
      
      setShouldWrap(screenWidth < totalRequiredWidth);
    };

    checkLayout();
    window.addEventListener('resize', checkLayout);
    
    // 初期レンダリング後に再チェック
    const timer = setTimeout(checkLayout, 100);

    return () => {
      window.removeEventListener('resize', checkLayout);
      clearTimeout(timer);
    };
  }, [isAuthenticated, userProfile]);

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

  // 再利用できるナビ部品
  const NavGroup = () => (
    <div className="flex gap-3 sm:gap-5 flex-nowrap shrink-0">
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
  );

  const SearchComponent = () => (
    <div className="w-40 sm:w-52 shrink-0">
      <SearchBar />
    </div>
  );

  const SearchIcon = () => (
    <div className="p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer">
      <Search size={18} className="text-muted-foreground hover:text-foreground" />
    </div>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      {!shouldWrap ? (
        // 1行レイアウト：すべてが1行に収まる場合
        <div 
          ref={navRef}
          className="flex items-center justify-between h-13 px-1 sm:px-2"
          style={{ gap: 'clamp(8px, 2vw, 20px)' }}
        >
          {/* ロゴ */}
          <Link href="/" className="text-base sm:text-lg font-bold text-foreground shrink-0">
            Canvasアプリ研究所
          </Link>

          {/* 416px以下：右寄せのナビ＋検索アイコン */}
          {isVeryNarrow ? (
            <div className="flex items-center gap-3">
              <NavGroup />
              <SearchIcon />
            </div>
          ) : (
            /* 通常：中央のナビ＋検索（動的に余白調整） */
            <div 
              className="flex items-center shrink-0"
              style={{ gap: 'clamp(8px, 2vw, 20px)' }}
            >
              <NavGroup />
              <SearchComponent />
            </div>
          )}

          {/* ユーザー操作 */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
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
      ) : (
        // 2行レイアウト：幅が足りない場合
        <>
          <div className="flex items-center justify-between h-13 px-2">
            {/* ロゴ */}
            <Link href="/" className="text-lg font-bold text-foreground shrink-0">
              Canvasアプリ研究所
            </Link>

            {/* ユーザー操作 */}
            <div className="flex items-center space-x-3 shrink-0">
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

          {/* 2行目：ナビ＋検索 */}
          <div className="w-full px-2 py-1 flex justify-center">
            <div className="flex items-center gap-5">
              <NavGroup />
              {isVeryNarrow ? <SearchIcon /> : <SearchComponent />}
            </div>
          </div>
        </>
      )}


    </nav>
  );
}