import { ArrowLeft } from "lucide-react";
import Image from "next/image";

interface ProfileHeaderSectionProps {
  displayName?: string;
  username?: string;
  totalPosts: number;
  coverImage?: string;
  onBack: () => void;
}

export function ProfileHeaderSection({
  displayName,
  username,
  totalPosts,
  coverImage,
  onBack,
}: ProfileHeaderSectionProps) {
  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={onBack}
            className="mr-3 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="戻る"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">
              {displayName || username || "プロフィール"}
            </h1>
            <p className="text-sm text-muted-foreground">{totalPosts}件の投稿</p>
          </div>
        </div>
      </div>

      {/* Cover Image */}
      <div className="relative h-48 sm:h-64 bg-muted">
        {coverImage ? (
          <Image
            src={coverImage}
            alt="カバー画像"
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="h-full bg-muted" />
        )}
      </div>
    </>
  );
}