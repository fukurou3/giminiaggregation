import { doc, getDoc, setDoc, updateDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import type { UserProfile, UserProfileForm } from '@/types/User';

/**
 * publicId（英数字6-10桁）を生成
 */
export function generatePublicId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = Math.floor(Math.random() * 5) + 6; // 6-10桁
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * publicIdの重複チェック
 */
export async function isPublicIdUnique(publicId: string): Promise<boolean> {
  try {
    const q = query(collection(db, 'userProfiles'), where('publicId', '==', publicId));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  } catch (error) {
    console.error('Error checking publicId uniqueness:', error);
    return false;
  }
}

/**
 * ユニークなpublicIdを生成
 */
export async function generateUniquePublicId(): Promise<string> {
  let publicId = generatePublicId();
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts && !(await isPublicIdUnique(publicId))) {
    publicId = generatePublicId();
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique publicId');
  }
  
  return publicId;
}

/**
 * ユーザープロフィールを取得
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'userProfiles', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        uid,
        publicId: data.publicId,
        username: data.username,
        photoURL: data.photoURL,
        photoFileName: data.photoFileName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        isSetupComplete: data.isSetupComplete || false,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * 初回ログイン時にユーザープロフィール（空のプレースホルダー）を作成
 * 実際の設定はsetupUserProfileで行う
 */
export async function createUserProfile(uid: string): Promise<void> {
  try {
    const docRef = doc(db, 'userProfiles', uid);
    const docSnap = await getDoc(docRef);
    
    // プロフィールが存在しない場合のみ作成（空のプレースホルダー）
    if (!docSnap.exists()) {
      await setDoc(docRef, {
        publicId: '',  // 初期段階では空
        username: '',  // 初期段階では空
        photoURL: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isSetupComplete: false,
      });
    }
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

/**
 * ユーザープロフィールをセットアップ（初回設定時）
 */
export async function setupUserProfile(uid: string, profileData: UserProfileForm): Promise<void> {
  try {
    // usernameの長さをチェック（日本語10文字まで）
    if (profileData.username.length > 10) {
      throw new Error('ユーザー名は10文字以内で入力してください');
    }
    
    // publicIdの長さをチェック（6-10桁）
    if (profileData.publicId.length < 6 || profileData.publicId.length > 10) {
      throw new Error('公開IDは6-10文字で入力してください');
    }
    
    // publicIdの文字種チェック（英数字のみ）
    if (!/^[a-zA-Z0-9]+$/.test(profileData.publicId)) {
      throw new Error('公開IDは英数字のみ使用できます');
    }
    
    // publicIdの重複チェック
    if (!(await isPublicIdUnique(profileData.publicId))) {
      throw new Error('この公開IDは既に使用されています');
    }
    
    const docRef = doc(db, 'userProfiles', uid);
    const updateData: Record<string, unknown> = {
      publicId: profileData.publicId,
      username: profileData.username,
      updatedAt: serverTimestamp(),
      isSetupComplete: true,
    };

    // 画像ファイルがある場合はアップロード
    if (profileData.photoFile) {
      const uploadResult = await uploadProfileImage(uid, profileData.photoFile);
      updateData.photoURL = uploadResult.url;
      updateData.photoFileName = uploadResult.fileName;
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error setting up user profile:', error);
    throw error;
  }
}

/**
 * プロフィール画像をGoogle Cloud Storageにアップロード
 */
export async function uploadProfileImage(uid: string, file: File): Promise<{ url: string; fileName: string }> {
  try {
    // Firebase認証トークンを取得
    const user = auth.currentUser;
    if (!user) {
      throw new Error('認証が必要です');
    }
    
    const token = await user.getIdToken();
    
    // FormDataを作成
    const formData = new FormData();
    formData.append('file', file);
    
    // API経由でアップロード
    const response = await fetch('/api/upload-profile-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'アップロードに失敗しました');
    }
    
    const result = await response.json();
    return {
      url: result.url,
      fileName: result.fileName
    };
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
}

/**
 * プロフィール画像の署名付きURLを更新
 */
export async function refreshProfileImageUrl(fileName: string): Promise<string> {
  try {
    // Firebase認証トークンを取得
    const user = auth.currentUser;
    if (!user) {
      throw new Error('認証が必要です');
    }
    
    const token = await user.getIdToken();
    
    // API経由でURL更新
    const response = await fetch('/api/refresh-profile-image-url', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileName }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'URL更新に失敗しました');
    }
    
    const result = await response.json();
    return result.url;
  } catch (error) {
    console.error('Error refreshing profile image URL:', error);
    throw error;
  }
}

/**
 * ユーザープロフィールを更新
 */
export async function updateUserProfile(uid: string, profileData: UserProfileForm): Promise<void> {
  try {
    // usernameの長さをチェック（日本語10文字まで）
    if (profileData.username.length > 10) {
      throw new Error('ユーザー名は10文字以内で入力してください');
    }
    
    // publicIdの長さをチェック（6-10桁）
    if (profileData.publicId.length < 6 || profileData.publicId.length > 10) {
      throw new Error('公開IDは6-10文字で入力してください');
    }
    
    // publicIdの文字種チェック（英数字のみ）
    if (!/^[a-zA-Z0-9]+$/.test(profileData.publicId)) {
      throw new Error('公開IDは英数字のみ使用できます');
    }
    
    // 現在のprofileを取得して、publicIdが変更されている場合のみ重複チェック
    const currentProfile = await getUserProfile(uid);
    if (currentProfile && currentProfile.publicId !== profileData.publicId) {
      if (!(await isPublicIdUnique(profileData.publicId))) {
        throw new Error('この公開IDは既に使用されています');
      }
    }
    
    const docRef = doc(db, 'userProfiles', uid);
    const updateData: Record<string, unknown> = {
      publicId: profileData.publicId,
      username: profileData.username,
      updatedAt: serverTimestamp(),
      isSetupComplete: true,
    };

    // 画像ファイルがある場合はアップロード
    if (profileData.photoFile) {
      const uploadResult = await uploadProfileImage(uid, profileData.photoFile);
      updateData.photoURL = uploadResult.url;
      updateData.photoFileName = uploadResult.fileName;
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}