import { Camera, User } from "lucide-react";
import Image from "next/image";
import { ImageUploader } from "@/components/ui/ImageUploader";

interface ImageUploadSectionProps {
  photoPreview: string | null;
  coverPreview: string | null;
  photoUrls: string[];
  onPhotoUrlsChange: (urls: string[]) => void;
  onCoverChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export function ImageUploadSection({
  photoPreview,
  coverPreview,
  photoUrls,
  onPhotoUrlsChange,
  onCoverChange,
  disabled = false,
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
        <div className="space-y-4">
          {/* 現在のプロフィール画像プレビュー */}
          {photoPreview && photoUrls.length === 0 && (
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-muted">
                <Image
                  src={photoPreview}
                  alt="現在のプロフィール画像"
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                現在のプロフィール画像 (新しい画像をアップロードで置き換え)
              </p>
            </div>
          )}
          
          {/* 統一された画像アップローダー (avatar mode) */}
          <ImageUploader
            images={photoUrls}
            onImagesChange={onPhotoUrlsChange}
            maxImages={1}
            mode="avatar"
            disabled={disabled}
          />
          
          <p className="text-xs text-muted-foreground">
            画像は正方形（1:1）に自動的に切り抜きされ、256px と 512px のサイズで最適化されます
          </p>
        </div>
      </div>
    </>
  );
}