import { Calendar, MapPin, Link as LinkIcon, Twitter, Github, Mail, User, Edit2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { UserProfile } from "@/types/User";
import { formatDate } from "@/lib/utils/date";

interface ProfileInfoSectionProps {
  profile: UserProfile;
  photoURL?: string;
  displayName?: string;
  isOwnProfile: boolean;
  stats: {
    totalPosts: number;
    totalFavorites: number;
    totalViews: number;
  };
}

export function ProfileInfoSection({
  profile,
  photoURL,
  displayName,
  isOwnProfile,
  stats,
}: ProfileInfoSectionProps) {
  return (
    <div className="relative px-4 pb-4">
      {/* Avatar */}
      <div className="absolute -top-16 sm:-top-20">
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-background overflow-hidden bg-muted">
          {photoURL ? (
            <Image
              src={photoURL}
              alt={displayName || "プロフィール画像"}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary">
              <User className="w-8 h-8 sm:w-12 sm:h-12 text-primary-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="pt-12 sm:pt-16">
        <div className="space-y-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              {profile.displayName || profile.username || "名前未設定"}
            </h2>
            {profile.username && (
              <p className="text-muted-foreground">@{profile.username}</p>
            )}
          </div>

          {profile.bio && (
            <p className="text-foreground leading-relaxed">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {profile.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <div className="flex items-center gap-1">
                <LinkIcon className="w-4 h-4" />
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
            {profile.twitter && (
              <div className="flex items-center gap-1">
                <Twitter className="w-4 h-4" />
                <a
                  href={`https://twitter.com/${profile.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @{profile.twitter}
                </a>
              </div>
            )}
            {profile.github && (
              <div className="flex items-center gap-1">
                <Github className="w-4 h-4" />
                <a
                  href={`https://github.com/${profile.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {profile.github}
                </a>
              </div>
            )}
            {profile.showEmail && profile.email && (
              <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                <span>{profile.email}</span>
              </div>
            )}
          </div>

          {profile.createdAt && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(profile.createdAt)}に登録</span>
            </div>
          )}

          <div className="flex gap-6 text-sm">
            <div className="space-x-1">
              <span className="font-semibold text-foreground">{stats.totalPosts}</span>
              <span className="text-muted-foreground">投稿</span>
            </div>
            <div className="space-x-1">
              <span className="font-semibold text-foreground">{stats.totalFavorites}</span>
              <span className="text-muted-foreground">お気に入り</span>
            </div>
            <div className="space-x-1">
              <span className="font-semibold text-foreground">{stats.totalViews}</span>
              <span className="text-muted-foreground">閲覧数</span>
            </div>
          </div>

          {/* Profile Actions */}
          <div className="flex justify-end pt-4">
            {isOwnProfile ? (
              <Link
                href="/settings/profile"
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-full hover:bg-muted transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span className="text-sm font-medium">プロフィールを編集</span>
              </Link>
            ) : (
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-medium">
                フォロー
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}