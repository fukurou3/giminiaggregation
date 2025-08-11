import { FileText, Heart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Post } from "@/types/Post";
import { PostGrid } from "@/components/ui/PostGrid";

type TabType = "posts" | "favorites";

interface ProfileTabsSectionProps {
  posts: Post[];
  favorites: Post[];
  isOwnProfile: boolean;
  isMobile: boolean;
  layoutPhase: string;
}

export function ProfileTabsSection({
  posts,
  favorites,
  isOwnProfile,
  isMobile,
  layoutPhase
}: ProfileTabsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const displayPosts = activeTab === "posts" ? posts : favorites;

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 py-4 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "posts"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              <span>投稿 ({posts.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex-1 py-4 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "favorites"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Heart className="w-4 h-4" />
              <span>お気に入り ({favorites.length})</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
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
  );
}