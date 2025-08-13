import { FileText, Heart } from "lucide-react";
import Link from "next/link";
import { Post } from "@/types/Post";
import { PostGrid } from "@/components/ui/PostGrid";
import { useState, useEffect } from "react";

interface ProfileTabsSectionProps {
  posts: Post[];
  isOwnProfile: boolean;
  isMobile: boolean;
  layoutPhase: string;
  uid: string;
}

export function ProfileTabsSection({
  posts,
  isOwnProfile,
  isMobile,
  layoutPhase,
  uid
}: ProfileTabsSectionProps) {
  console.log('ProfileTabsSection - layoutPhase:', layoutPhase);
  console.log('ProfileTabsSection - showCategory should be:', layoutPhase !== 'phase4');
  
  const [activeTab, setActiveTab] = useState<'posts' | 'favorites'>('posts');
  const [favorites, setFavorites] = useState<Post[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  
  // お気に入り取得
  useEffect(() => {
    if (activeTab === 'favorites' && uid && favorites.length === 0) {
      setFavoritesLoading(true);
      fetch(`/api/users/${uid}/favorites`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data?.favorites) {
            setFavorites(data.data.favorites);
          }
        })
        .catch(err => console.error('Failed to fetch favorites:', err))
        .finally(() => setFavoritesLoading(false));
    }
  }, [activeTab, uid, favorites.length]);
  
  return (
    <div>
      {/* Tab Header */}
      <div className="border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
              activeTab === 'posts' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">投稿 ({posts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
              activeTab === 'favorites' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span className="text-sm font-medium">お気に入り ({favorites.length})</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="py-8">
        {activeTab === 'posts' ? (
          // 投稿タブ
          posts.length === 0 ? (
            <div className={`text-center ${isMobile ? 'py-8' : 'py-12'}`}>
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
            </div>
          ) : (
            <PostGrid
              posts={posts}
              layout="grid"
              responsive={layoutPhase === 'phase4'}
              showViews={false}
              showCategory={true}
              className={layoutPhase !== 'phase4' ? 'grid-cols-[repeat(auto-fill,minmax(280px,1fr))]' : ''}
              gridCols={{ sm: 2, md: 3, lg: 3, xl: 4 }}
            />
          )
        ) : (
          // お気に入りタブ
          favoritesLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground mt-4">読み込み中...</p>
            </div>
          ) : favorites.length === 0 ? (
            <div className={`text-center ${isMobile ? 'py-8' : 'py-12'}`}>
              <Heart className={`mx-auto text-muted-foreground/50 mb-4 ${
                isMobile ? 'w-12 h-12' : 'w-16 h-16'
              }`} />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                お気に入りがありません
              </h3>
              <p className="text-muted-foreground">
                {isOwnProfile ? "気に入った作品をお気に入りに追加しましょう" : "このユーザーはまだ作品をお気に入りしていません"}
              </p>
            </div>
          ) : (
            <PostGrid
              posts={favorites}
              layout="grid"
              responsive={layoutPhase === 'phase4'}
              showViews={false}
              showCategory={true}
              className={layoutPhase !== 'phase4' ? 'grid-cols-[repeat(auto-fill,minmax(280px,1fr))]' : ''}
              gridCols={{ sm: 2, md: 3, lg: 3, xl: 4 }}
            />
          )
        )}
      </div>
    </div>
  );
}