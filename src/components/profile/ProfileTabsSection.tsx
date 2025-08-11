import { FileText } from "lucide-react";
import Link from "next/link";
import { Post } from "@/types/Post";
import { PostGrid } from "@/components/ui/PostGrid";

interface ProfileTabsSectionProps {
  posts: Post[];
  isOwnProfile: boolean;
  isMobile: boolean;
  layoutPhase: string;
}

export function ProfileTabsSection({
  posts,
  isOwnProfile,
  isMobile,
  layoutPhase
}: ProfileTabsSectionProps) {
  return (
    <div>
      {/* Header */}
      <div className="border-b border-border">
        <div className="py-4 px-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">投稿 ({posts.length})</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-8">
        {posts.length === 0 ? (
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
            showCategory={layoutPhase !== 'phase4'}
            className={layoutPhase !== 'phase4' ? 'grid-cols-[repeat(auto-fill,minmax(280px,1fr))]' : ''}
            gridCols={{ sm: 2, md: 3, lg: 3, xl: 4 }}
          />
        )}
      </div>
    </div>
  );
}