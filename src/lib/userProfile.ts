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
      console.log('getUserProfile - Raw Firestore data:', data);
      console.log('getUserProfile - photoURL from Firestore:', data.photoURL);
      let profile: UserProfile = {
        uid,
        publicId: data.publicId,
        username: data.username,
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL,
        photoFileName: data.photoFileName,
        coverImage: data.coverImage,
        bio: data.bio,
        location: data.location,
        website: data.website,
        twitter: data.twitter,
        github: data.github,
        showEmail: data.showEmail,
        isVerified: data.isVerified,
        badges: data.badges,
        role: data.role,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        isSetupComplete: data.isSetupComplete || false,
      };

      // publicIdが空または存在しない場合は自動生成
      if (!profile.publicId || profile.publicId === '') {
        const generatePublicId = () => {
          const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
          let result = '';
          for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return result;
        };

        profile.publicId = generatePublicId();
        
        // Firestoreを更新
        await updateDoc(docRef, {
          publicId: profile.publicId,
          updatedAt: serverTimestamp()
        });

        console.log(`Auto-generated publicId for user ${uid}: ${profile.publicId}`);
      }

      return profile;
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
    
    // プロフィールが存在しない場合のみ作成
    if (!docSnap.exists()) {
      // ランダムなpublicIdを生成（8文字）
      const generatePublicId = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      
      await setDoc(docRef, {
        uid,
        publicId: generatePublicId(),
        username: '',
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
    const updateData: Record<string, any> = {
      publicId: profileData.publicId,
      username: profileData.username,
      updatedAt: serverTimestamp(),
      isSetupComplete: true,
    };

    // 画像ファイルがある場合はアップロード（厳密なvalidation付き）
    if (profileData.photoFile) {
      try {
        const uploadResult = await uploadProfileImage(uid, profileData.photoFile);
        console.log('Setup upload result received:', uploadResult);
        
        // uploadResultが有効で、urlがundefinedでないことを確認
        if (uploadResult && uploadResult.url && uploadResult.url !== undefined && uploadResult.url !== null && uploadResult.url !== '') {
          updateData.photoURL = uploadResult.url;
        } else {
          console.warn('Setup upload result URL is invalid:', uploadResult);
        }
        
        if (uploadResult && uploadResult.fileName && uploadResult.fileName !== undefined && uploadResult.fileName !== null && uploadResult.fileName !== '') {
          updateData.photoFileName = uploadResult.fileName;
        }
      } catch (uploadError) {
        console.error('Error uploading image in setup:', uploadError);
        // アップロードエラーの場合は画像以外の情報のみ更新
      }
    }

    // undefined値を除外する関数
    const removeUndefinedFields = (obj: any): any => {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined && value !== null && value !== '') {
          cleaned[key] = value;
        } else {
          console.log(`Setup filtering out field '${key}' with value:`, value);
        }
      });
      return cleaned;
    };

    const cleanedUpdateData = removeUndefinedFields(updateData);
    console.log('setupUserProfile - data being sent to Firestore:', cleanedUpdateData);

    // 最終検証: photoURLフィールドがundefinedでないことを確認
    if ('photoURL' in cleanedUpdateData && cleanedUpdateData.photoURL === undefined) {
      console.error('CRITICAL SETUP: photoURL is still undefined after cleaning!');
      delete cleanedUpdateData.photoURL;
    }

    await updateDoc(docRef, cleanedUpdateData);
  } catch (error) {
    console.error('Error setting up user profile:', error);
    throw error;
  }
}

/**
 * プロフィール画像をGoogle Cloud Storageにアップロード
 * @deprecated この関数は非推奨です。新しい統合画像パイプライン（ImageUploader with avatar mode）を使用してください。
 */
export async function uploadProfileImage(uid: string, file: File): Promise<{ url: string; fileName: string }> {
  console.warn('[DEPRECATED] uploadProfileImage is deprecated. Use unified image pipeline with avatar mode instead.');
  
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
    
    // API経由でアップロード（非推奨警告付き）
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
    
    // 非推奨警告をコンソールに出力
    if (result.deprecated) {
      console.warn('[MIGRATION NOTICE]', result.migrationNote);
    }
    
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
/**
 * 新しい画像パイプライン対応のプロフィール更新関数
 */
export async function updateUserProfileDirect(uid: string, profileData: any): Promise<void> {
  try {
    const docRef = doc(db, 'userProfiles', uid);
    
    // 明示的にフィールドを構築（undefinedを確実に除外）
    const updateData: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    // 各フィールドを個別に検証して追加
    if (profileData.publicId && profileData.publicId !== undefined && profileData.publicId !== null && profileData.publicId !== '') {
      updateData.publicId = profileData.publicId;
    }
    
    if (profileData.username && profileData.username !== undefined && profileData.username !== null && profileData.username !== '') {
      updateData.username = profileData.username;
    }
    
    if (profileData.photoURL && profileData.photoURL !== undefined && profileData.photoURL !== null && profileData.photoURL !== '') {
      updateData.photoURL = profileData.photoURL;
    }
    
    updateData.isSetupComplete = true;

    console.log('updateUserProfileDirect - Final data:', updateData);
    console.log('updateUserProfileDirect - photoURL being saved:', updateData.photoURL);

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating user profile directly:', error);
    throw error;
  }
}

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
    const updateData: Record<string, any> = {
      publicId: profileData.publicId,
      username: profileData.username,
      updatedAt: serverTimestamp(),
      isSetupComplete: true,
    };

    // 画像ファイルがある場合はアップロード（厳密なvalidation付き）
    if (profileData.photoFile) {
      try {
        const uploadResult = await uploadProfileImage(uid, profileData.photoFile);
        console.log('Upload result received:', uploadResult);
        
        // uploadResultが有効で、urlがundefinedでないことを確認
        if (uploadResult && uploadResult.url && uploadResult.url !== undefined && uploadResult.url !== null && uploadResult.url !== '') {
          updateData.photoURL = uploadResult.url;
        } else {
          console.warn('Upload result URL is invalid:', uploadResult);
        }
        
        if (uploadResult && uploadResult.fileName && uploadResult.fileName !== undefined && uploadResult.fileName !== null && uploadResult.fileName !== '') {
          updateData.photoFileName = uploadResult.fileName;
        }
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        // アップロードエラーの場合は画像以外の情報のみ更新
      }
    }

    // undefined値を除外する関数
    const removeUndefinedFields = (obj: any): any => {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined && value !== null && value !== '') {
          cleaned[key] = value;
        } else {
          console.log(`Filtering out field '${key}' with value:`, value);
        }
      });
      return cleaned;
    };

    const cleanedUpdateData = removeUndefinedFields(updateData);
    console.log('updateUserProfile - data being sent to Firestore:', cleanedUpdateData);

    // 最終検証: photoURLフィールドがundefinedでないことを確認
    if ('photoURL' in cleanedUpdateData && cleanedUpdateData.photoURL === undefined) {
      console.error('CRITICAL: photoURL is still undefined after cleaning!');
      delete cleanedUpdateData.photoURL;
    }

    await updateDoc(docRef, cleanedUpdateData);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}