export interface UserProfile {
  id?: string;
  uid: string;
  publicId: string; // URL用の一意のID
  username?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
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
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    emailNotifications?: boolean;
    pushNotifications?: boolean;
  };
  stats?: {
    totalPosts?: number;
    totalFavorites?: number;
    totalViews?: number;
    followers?: number;
    following?: number;
  };
  createdAt?: Date | any;
  updatedAt?: Date | any;
}