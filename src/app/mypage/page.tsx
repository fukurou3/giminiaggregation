"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { Post } from "@/types/Post";
import { Heart, FileText, Loader2 } from "lucide-react";
import { PostGrid } from "@/components/ui/PostGrid";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import Link from "next/link";

export default function MyPage() {
  const { user, loading: authLoading } = useAuth();
  const { userProfile } = useUserProfile();
  const router = useRouter();
  const { layoutPhase, isMobile } = useResponsiveLayout();
  const [activeTab, setActiveTab] = useState<"favorites" | "posts">("favorites");
  const [favorites, setFavorites] = useState<Post[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const [favoritesResponse, postsResponse] = await Promise.all([
        fetch(`/api/users/${user.uid}/favorites`),
        fetch(`/api/users/${user.uid}/posts`)
      ]);

      console.log('Favorites response status:', favoritesResponse.status);
      console.log('Posts response status:', postsResponse.status);

      // お気に入りAPIレスポンスの処理
      let favoritesData = null;
      if (favoritesResponse.ok) {
        favoritesData = await favoritesResponse.json();
        console.log('Favorites data:', favoritesData);
        if (favoritesData.success) {
          setFavorites(favoritesData.data.favorites || []);
        }
      } else {
        console.error('Favorites API error:', favoritesResponse.status, await favoritesResponse.text());
        setFavorites([]); // エラーの場合は空配列を設定
      }

      // 投稿APIレスポンスの処理
      let postsData = null;
      if (postsResponse.ok) {
        postsData = await postsResponse.json();
        console.log('Posts data:', postsData);
        if (postsData.success) {
          setMyPosts(postsData.data.posts || []);
        }
      } else {
        console.error('Posts API error:', postsResponse.status, await postsResponse.text());
        setMyPosts([]); // エラーの場合は空配列を設定
      }

      // 両方のAPIが失敗した場合のみエラーを表示
      if (!favoritesResponse.ok && !postsResponse.ok) {
        throw new Error("データの取得に失敗しました");
      }

    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("データの取得に失敗しました。ネットワーク接続を確認してください。");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // 認証状態の読み込み中は何もしない
    if (authLoading) return;
    
    // 認証状態が確定してユーザーがいない場合のみリダイレクト
    if (!authLoading && !user) {
      router.push("/");
      return;
    }
    
    // ユーザーが存在する場合はデータを取得
    if (user) {
      fetchUserData();
    }
  }, [user, authLoading, router, fetchUserData]);

  // 認証状態の読み込み中はローディング表示
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 認証されていない場合
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">ログインが必要です</h2>
          <p className="text-muted-foreground">マイページを表示するにはログインしてください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className={`${
        layoutPhase === 'phase1' ? 'max-w-7xl' : 
        layoutPhase === 'phase2' || layoutPhase === 'phase3' ? 'max-w-6xl' : 
        'w-full'
      } mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
        <div className={`mb-8 ${isMobile ? 'px-2' : ''}`}>
          <h1 className={`font-bold text-foreground mb-2 ${
            isMobile ? 'text-2xl' : 'text-3xl'
          }`}>マイページ</h1>
          <p className="text-muted-foreground">
            {userProfile?.username || "ユーザー"}さんのページ
          </p>
          {userProfile?.publicId && (
            <p className="text-xs text-muted-foreground mt-1">
              プロフィールURL: 
              <Link 
                href={`/users/${userProfile.publicId}`}
                className="text-primary hover:underline ml-1"
              >
                /users/{userProfile.publicId}
              </Link>
            </p>
          )}
        </div>

        {/* タブナビゲーション */}
        <div className={`bg-background border border-border rounded-lg shadow-md mb-6 ${
          isMobile ? 'mx-2' : ''
        }`}>
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("favorites")}
              className={`flex-1 ${isMobile ? 'px-3 py-3 text-sm' : 'px-6 py-4'} text-center font-medium transition-colors ${
                activeTab === "favorites"
                  ? "bg-primary/5 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Heart className="inline-block w-5 h-5 mr-2" />
              お気に入り ({favorites.length})
            </button>
            <button
              onClick={() => setActiveTab("posts")}
              className={`flex-1 ${isMobile ? 'px-3 py-3 text-sm' : 'px-6 py-4'} text-center font-medium transition-colors ${
                activeTab === "posts"
                  ? "bg-primary/5 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <FileText className="inline-block w-5 h-5 mr-2" />
              投稿した作品 ({myPosts.length})
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">読み込み中...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-error mb-4">{error}</p>
                <button
                  onClick={fetchUserData}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  再試行
                </button>
              </div>
            ) : (
              <div>
                {activeTab === "favorites" && (
                  <div>
                    {favorites.length === 0 ? (
                      <div className={`text-center ${isMobile ? 'py-8' : 'py-12'}`}>
                        <Heart className={`mx-auto text-muted-foreground/50 mb-4 ${
                          isMobile ? 'w-12 h-12' : 'w-16 h-16'
                        }`} />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          お気に入りした作品がありません
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          気になる作品をお気に入りに追加してみましょう
                        </p>
                        <button
                          onClick={() => router.push("/")}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                          作品を見る
                        </button>
                      </div>
                    ) : (
                      <PostGrid
                        posts={favorites}
                        layout="grid"
                        responsive={layoutPhase === 'phase4'}
                        showViews={false}
                        showCategory={layoutPhase !== 'phase4'}
                        className={layoutPhase !== 'phase4' ? 'grid-cols-[repeat(auto-fill,minmax(280px,1fr))]' : ''}
                        gridCols={{ md: 2, lg: 3 }}
                      />
                    )}
                  </div>
                )}

                {activeTab === "posts" && (
                  <div>
                    {myPosts.length === 0 ? (
                      <div className={`text-center ${isMobile ? 'py-8' : 'py-12'}`}>
                        <FileText className={`mx-auto text-muted-foreground/50 mb-4 ${
                          isMobile ? 'w-12 h-12' : 'w-16 h-16'
                        }`} />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          投稿した作品がありません
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          あなたの作品を投稿してみましょう
                        </p>
                        <button
                          onClick={() => router.push("/submit")}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                          作品を投稿する
                        </button>
                      </div>
                    ) : (
                      <PostGrid
                        posts={myPosts}
                        layout="grid"
                        responsive={layoutPhase === 'phase4'}
                        showViews={false}
                        showCategory={layoutPhase !== 'phase4'}
                        className={layoutPhase !== 'phase4' ? 'grid-cols-[repeat(auto-fill,minmax(280px,1fr))]' : ''}
                        gridCols={{ md: 2, lg: 3 }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}