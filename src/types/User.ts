export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  photoFileName?: string;
  createdAt: Date;
  updatedAt: Date;
  isSetupComplete: boolean;
}

export interface UserProfileForm {
  displayName: string;
  photoFile?: File;
}