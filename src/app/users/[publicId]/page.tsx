'use client';

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { Post } from "@/types/Post";
import { UserProfile } from "@/types/User";
import { PostGrid } from "@/components/ui/PostGrid";
import { 
  Calendar, 
  MapPin, 
  Link as LinkIcon, 
  ArrowLeft,
  FileText,
  Heart,
  Loader2,
  Edit2,
  Twitter,
  Github,
  Globe,
  Mail,
  User
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/utils/date";

interface ProfileData {
  profile: UserProfile;
  posts: Post[];
  favorites: Post[];
  stats: {
    totalPosts: number;
    totalFavorites: number;
    totalViews: number;
  };
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { layoutPhase, isMobile } = useResponsiveLayout();
  const publicId = params.publicId as string;
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "favorites">("posts");
  
  // 自分のプロフィールかどうか
  const isOwnProfile = user && profileData?.profile.uid === user.uid;

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching profile for publicId:', publicId);
      
      // プロフィール情報の取得
      const profileResponse = await fetch(`/api/users/profile/${publicId}`);
      console.log('Profile response status:', profileResponse.status);
      
      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error('Profile API error:', profileResponse.status, errorText);
        
        if (profileResponse.status === 404) {
          throw new Error("ユーザーが見つかりません");
        }
        throw new Error("プロフィールの取得に失敗しました");
      }
      
      const profileResult = await profileResponse.json();
      console.log('Profile result:', profileResult);
      
      if (!profileResult.success || !profileResult.data) {
        throw new Error("プロフィールデータが不正です");
      }
      
      setProfileData(profileResult.data);
      
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [publicId]);

  useEffect(() => {
    if (publicId) {
      fetchProfileData();
    }
  }, [publicId, fetchProfileData]);

  // ローディング表示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">プロフィールを読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error || !profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {error || "プロフィールが見つかりません"}
          </h2>
          <p className="text-muted-foreground mb-6">
            指定されたプロフィールID「{publicId}」のユーザーは存在しないか、まだプロフィールが設定されていません。
          </p>
          <div className="space-y-2">
            <button
              onClick={() => router.push("/")}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              ホームに戻る
            </button>
            {user && (
              <button
                onClick={() => router.push("/mypage")}
                className="w-full px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
              >
                マイページを見る
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { profile, posts, favorites, stats } = profileData;
  const displayPosts = activeTab === "posts" ? posts : favorites;

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー部分 */}
      <div className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-lg bg-opacity-90">
        <div className={`${
          layoutPhase === 'phase1' ? 'max-w-7xl' : 
          layoutPhase === 'phase2' || layoutPhase === 'phase3' ? 'max-w-6xl' : 
          'w-full'
        } mx-auto px-4 sm:px-6 lg:px-8`}>
          <div className="flex items-center h-14">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="戻る"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-bold text-lg truncate">
                {profile.displayName || profile.username || "ユーザー"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {stats.totalPosts} 投稿
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* カバー画像 */}
      <div className="relative h-32 sm:h-48 lg:h-56 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500">
        {profile.coverImage && (
          <Image
            src={profile.coverImage}
            alt="カバー画像"
            fill
            className="object-cover"
            priority
          />
        )}
      </div>

      {/* プロフィール情報 */}
      <div className={`${
        layoutPhase === 'phase1' ? 'max-w-7xl' : 
        layoutPhase === 'phase2' || layoutPhase === 'phase3' ? 'max-w-6xl' : 
        'w-full'
      } mx-auto px-4 sm:px-6 lg:px-8`}>
        <div className="relative">
          {/* アバター */}
          <div className="absolute -top-16 sm:-top-20">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-background bg-muted overflow-hidden">
              {profile.photoURL ? (
                <Image
                  src={profile.photoURL}
                  alt={profile.displayName || "ユーザー"}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary">
                  <User className="w-16 h-16 sm:w-20 sm:h-20 text-primary-foreground" />
                </div>
              )}
              
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                  <span className="truncate max-w-xs">
                    {profile.website.replace(/^https?:\/\//, "")}
                  </span>
                </a>
              )}

              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {profile.createdAt ? formatDate(profile.createdAt) : "不明"} から利用
                </span>
              </div>
            </div>

            {/* ソーシャルリンク */}
            <div className="flex gap-3 mb-4">
              {profile.twitter && (
                <a
                  href={`https://twitter.com/${profile.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {profile.github && (
                <a
                  href={`https://github.com/${profile.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5" />
                </a>
              )}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  aria-label="Email"
                >
                  <Mail className="w-5 h-5" />
                </a>
              )}
            </div>

            {/* 統計情報 */}
            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-bold text-foreground">{stats.totalPosts}</span>
                <span className="text-muted-foreground ml-1">投稿</span>
              </div>
              <div>
                <span className="font-bold text-foreground">{stats.totalFavorites}</span>
                <span className="text-muted-foreground ml-1">お気に入り</span>
              </div>
              <div>
                <span className="font-bold text-foreground">{stats.totalViews.toLocaleString()}</span>
                <span className="text-muted-foreground ml-1">総閲覧数</span>
              </div>
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-border">
          <div className="flex">
            <button
              onClick={() => setActiveTab("posts")}
              className={`flex-1 px-4 py-4 text-center font-medium transition-colors relative ${
                activeTab === "posts"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                <span>投稿 ({posts.length})</span>
              </div>
              {activeTab === "posts" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("favorites")}
              className={`flex-1 px-4 py-4 text-center font-medium transition-colors relative ${
                activeTab === "favorites"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Heart className="w-4 h-4" />
                <span>お気に入り ({favorites.length})</span>
              </div>
              {activeTab === "favorites" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
              )}
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="py-8">
          {displayPosts.length === 0 ? (
            <div className={`text-center ${isMobile ? 'py-8' : 'py-12'}`}>
              {activeTab === "posts" ? (
                <>
                  <FileText className={`mx-auto text-muted-foreground/50 mb-4 ${
                    isMobile ? 'w-12 h-12' : 'w-16 h-16'
                  }`} />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    まだ投稿がありません
                  </h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile ? "最初の作品を投稿してみましょう" : "このユーザーはまだ作品を投稿していません"}
                  </p>
                  {isOwnProfile && (
                    <Link
                      href="/submit"
                      className="inline-block mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      作品を投稿する
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Heart className={`mx-auto text-muted-foreground/50 mb-4 ${
                    isMobile ? 'w-12 h-12' : 'w-16 h-16'
                  }`} />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    お気に入りがありません
                  </h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile ? "気になる作品をお気に入りに追加してみましょう" : "このユーザーはまだお気に入りを追加していません"}
                  </p>
                  {isOwnProfile && (
                    <Link
                      href="/"
                      className="inline-block mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      作品を探す
                    </Link>
                  )}
                </>
              )}
            </div>
          ) : (
            <PostGrid
              posts={displayPosts}
              layout="grid"
              responsive={layoutPhase === 'phase4'}
              showViews={false}
              showCategory={layoutPhase !== 'phase4'}
              className={layoutPhase !== 'phase4' ? 'grid-cols-[repeat(auto-fill,minmax(280px,1fr))]' : ''}
              gridCols={{ sm: 2, md: 3, lg: 3, xl: 4 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}