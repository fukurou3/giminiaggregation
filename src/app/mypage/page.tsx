"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { Post } from "@/types/Post";
import { Heart, FileText, Loader2 } from "lucide-react";
import { WorkCard } from "@/components/ui/WorkCard";

export default function MyPage() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const router = useRouter();
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
    if (!user) {
      router.push("/");
      return;
    }
    
    fetchUserData();
  }, [user, router, fetchUserData]);

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
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">マイページ</h1>
          <p className="text-muted-foreground">
            {userProfile?.username || "ユーザー"}さんのページ
          </p>
        </div>

        {/* タブナビゲーション */}
        <div className="bg-background border border-border rounded-lg shadow-md mb-6">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("favorites")}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
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
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
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
                      <div className="text-center py-12">
                        <Heart className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favorites.map((post) => (
                          <WorkCard key={post.id} post={post} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "posts" && (
                  <div>
                    {myPosts.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myPosts.map((post) => (
                          <WorkCard key={post.id} post={post} />
                        ))}
                      </div>
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