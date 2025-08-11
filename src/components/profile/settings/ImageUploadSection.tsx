import { Camera, User } from "lucide-react";
import Image from "next/image";

interface ImageUploadSectionProps {
  photoPreview: string | null;
  coverPreview: string | null;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCoverChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImageUploadSection({
  photoPreview,
  coverPreview,
  onPhotoChange,
  onCoverChange,
}: ImageUploadSectionProps) {
  return (
    <>
      {/* カバー画像 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          カバー画像
        </label>
        <div className="relative h-32 sm:h-48 bg-muted rounded-lg overflow-hidden">
          {coverPreview ? (
            <Image
              src={coverPreview}
              alt="カバー画像"
              fill
              className="object-cover"
            />
          ) : (
            <div className="h-full bg-muted" />
          )}
          <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
            <div className="text-white text-center">
              <Camera className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm">カバー画像を変更</span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={onCoverChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* プロフィール画像 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          プロフィール画像
        </label>
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-muted">
            {photoPreview ? (
              <Image
                src={photoPreview}
                alt="プロフィール画像"
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary">
                <User className="w-12 h-12 text-primary-foreground" />
              </div>
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={onPhotoChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </>
  );
}