export interface UserProfile {
  uid: string;
  publicId: string;  // 英数字6-10桁のランダムID
  username: string;  // 日本語10文字までの公開ハンドル
  photoURL?: string;
  photoFileName?: string;
  createdAt: Date;
  updatedAt: Date;
  isSetupComplete: boolean;
}

export interface UserProfileForm {
  publicId: string;  // 英数字6-10桁のランダムID
  username: string;  // 日本語10文字までの公開ハンドル
  photoFile?: File;
}