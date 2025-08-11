export interface UserProfile {
  uid: string;
  publicId: string;  // URL用の一意のID
  username?: string;  // ユーザー名
  displayName?: string; // 表示名
  email?: string;
  photoURL?: string;
  photoFileName?: string;
  coverImage?: string;
  bio?: string;
  location?: string;
  website?: string;
  twitter?: string;
  github?: string;
  showEmail?: boolean;
  isVerified?: boolean;
  badges?: string[];
  role?: 'user' | 'admin' | 'moderator';
  createdAt: Date;
  updatedAt: Date;
  isSetupComplete: boolean;
}

export interface UserProfileForm {
  publicId: string;  // 英数字6-10桁のランダムID
  username: string;  // 日本語10文字までの公開ハンドル
  photoFile?: File;
}