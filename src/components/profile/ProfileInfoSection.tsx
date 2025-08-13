import { MapPin, Link as LinkIcon, Twitter, Github, Mail, User, ArrowLeft, Settings } from "lucide-react";
import Image from "next/image";
import { UserProfile } from "@/types/User";
import { getAvatarDisplayUrl } from "@/lib/utils/imageUrlHelpers";

interface ProfileInfoSectionProps {
  profile: UserProfile;
  photoURL?: string;
  displayName?: string;
  onBack: () => void;
  isOwnProfile?: boolean;
  onEditProfile?: () => void;
}

export function ProfileInfoSection({
  profile,
  photoURL,
  displayName,
  onBack,
  isOwnProfile,
  onEditProfile,
}: ProfileInfoSectionProps) {
  return (
    <div className="relative px-0 pb-1">
      {/* Header with Back Button and Profile Info */}
      <div className="flex items-center gap-2 mb-4 mt-2">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="戻る"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background overflow-hidden bg-muted flex-shrink-0">
          {photoURL ? (
            <Image
              src={getAvatarDisplayUrl(photoURL, 'small') || photoURL}
              alt={displayName || "プロフィール画像"}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary">
              <User className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            {profile.displayName || profile.username || "名前未設定"}
          </h2>
          <p className="text-sm text-muted-foreground">@{profile.publicId}</p>
        </div>
        
        {isOwnProfile && onEditProfile && (
          <button
            onClick={onEditProfile}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="プロフィール編集"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Profile Info */}
      <div>
        <div className="space-y-4">

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
        </div>
      </div>
    </div>
  );
}