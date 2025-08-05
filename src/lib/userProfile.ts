import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import type { UserProfile, UserProfileForm } from '@/types/User';

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
        email: data.email,
        displayName: data.displayName,
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
 * 初回ログイン時にユーザープロフィールを作成
 */
export async function createUserProfile(uid: string, email: string): Promise<void> {
  try {
    const docRef = doc(db, 'userProfiles', uid);
    const docSnap = await getDoc(docRef);
    
    // プロフィールが存在しない場合のみ作成
    if (!docSnap.exists()) {
      await setDoc(docRef, {
        email,
        displayName: '',
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
    const docRef = doc(db, 'userProfiles', uid);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      displayName: profileData.displayName,
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