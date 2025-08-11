import { MapPin, Link as LinkIcon, Twitter, Github, Mail, Loader2, Save } from "lucide-react";

interface FormData {
  publicId: string;
  displayName: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  twitter: string;
  github: string;
  email: string;
  showEmail: boolean;
}

interface ProfileFormSectionProps {
  formData: FormData;
  onChange: (field: string, value: string | boolean) => void;
  saving: boolean;
  onCancel: () => void;
}

export function ProfileFormSection({ formData, onChange, saving, onCancel }: ProfileFormSectionProps) {
  return (
    <>
      {/* Basic Info */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-foreground">基本情報</h3>
        
        {/* プロフィールID */}
        <div>
          <label htmlFor="publicId" className="block text-sm font-medium text-foreground mb-2">
            プロフィールID <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">@</span>
            <input
              type="text"
              id="publicId"
              value={formData.publicId}
              onChange={(e) => onChange('publicId', e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="your-username"
              pattern="[a-zA-Z0-9_-]+"
              required
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            URLに使用されます: /users/{formData.publicId || "your-username"}
          </p>
        </div>

        {/* 表示名 */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-foreground mb-2">
            表示名
          </label>
          <input
            type="text"
            id="displayName"
            value={formData.displayName}
            onChange={(e) => onChange('displayName', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="あなたの名前"
          />
        </div>

        {/* ユーザー名 */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
            ユーザー名
          </label>
          <input
            type="text"
            id="username"
            value={formData.username}
            onChange={(e) => onChange('username', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="username"
          />
        </div>

        {/* 自己紹介 */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-2">
            自己紹介
          </label>
          <textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => onChange('bio', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={4}
            placeholder="あなたについて教えてください"
            maxLength={500}
          />
          <p className="mt-1 text-sm text-muted-foreground">
            {formData.bio.length}/500
          </p>
        </div>
      </div>

      {/* Contact & Social Info */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-foreground">連絡先・SNS情報</h3>
        
        {/* 場所 */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-foreground mb-2">
            <MapPin className="inline w-4 h-4 mr-1" />
            場所
          </label>
          <input
            type="text"
            id="location"
            value={formData.location}
            onChange={(e) => onChange('location', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="東京, 日本"
          />
        </div>

        {/* ウェブサイト */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-foreground mb-2">
            <LinkIcon className="inline w-4 h-4 mr-1" />
            ウェブサイト
          </label>
          <input
            type="url"
            id="website"
            value={formData.website}
            onChange={(e) => onChange('website', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="https://example.com"
          />
        </div>

        {/* Twitter */}
        <div>
          <label htmlFor="twitter" className="block text-sm font-medium text-foreground mb-2">
            <Twitter className="inline w-4 h-4 mr-1" />
            Twitter
          </label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">@</span>
            <input
              type="text"
              id="twitter"
              value={formData.twitter}
              onChange={(e) => onChange('twitter', e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="username"
            />
          </div>
        </div>

        {/* GitHub */}
        <div>
          <label htmlFor="github" className="block text-sm font-medium text-foreground mb-2">
            <Github className="inline w-4 h-4 mr-1" />
            GitHub
          </label>
          <input
            type="text"
            id="github"
            value={formData.github}
            onChange={(e) => onChange('github', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="username"
          />
        </div>

        {/* メールアドレス */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            <Mail className="inline w-4 h-4 mr-1" />
            メールアドレス
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => onChange('email', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="email@example.com"
          />
          <div className="mt-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.showEmail}
                onChange={(e) => onChange('showEmail', e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm text-muted-foreground">
                プロフィールにメールアドレスを表示する
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              保存する
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
        >
          キャンセル
        </button>
      </div>
    </>
  );
}