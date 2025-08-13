'use client';

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useUserProfile } from "@/hooks/useUserProfile";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { shouldMigrateImage } from '@/lib/utils/imageUrlHelpers';

// Settings Components
import { SettingsHeaderSection } from "@/components/profile/settings/SettingsHeaderSection";
import { ImageUploadSection } from "@/components/profile/settings/ImageUploadSection";
import { ProfileFormSection } from "@/components/profile/settings/ProfileFormSection";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const { userProfile, refreshProfile } = useUserProfile();
  const router = useRouter();
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showMigrationSuggestion, setShowMigrationSuggestion] = useState(false);
  
  // フォームデータ
  const [formData, setFormData] = useState({
    publicId: "",
    displayName: "",
    username: "",
    bio: "",
    location: "",
    website: "",
    twitter: "",
    github: "",
    email: "",
    showEmail: false,
  });
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // プロフィール情報を読み込み
  useEffect(() => {
    if (userProfile) {
      setFormData({
        publicId: userProfile.publicId || "",
        displayName: userProfile.displayName || "",
        username: userProfile.username || "",
        bio: userProfile.bio || "",
        location: userProfile.location || "",
        website: userProfile.website || "",
        twitter: userProfile.twitter || "",
        github: userProfile.github || "",
        email: userProfile.email || user?.email || "",
        showEmail: userProfile.showEmail || false,
      });
      
      if (userProfile.photoURL) {
        setPhotoPreview(userProfile.photoURL);
        
        // Check if migration suggestion should be shown
        if (shouldMigrateImage(userProfile.photoURL) && !userProfile.photoURLMigrated) {
          setShowMigrationSuggestion(true);
        }
      }
      if (userProfile.coverImage) {
        setCoverPreview(userProfile.coverImage);
      }
    } else if (user) {
      // 新規プロフィールの場合
      const suggestedPublicId = user.email?.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "";
      setFormData(prev => ({
        ...prev,
        publicId: suggestedPublicId,
        email: user.email || "",
      }));
    }
  }, [userProfile, user]);

  // 画像選択処理
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("画像サイズは5MB以下にしてください");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("カバー画像は10MB以下にしてください");
        return;
      }
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  // フォームデータ更新ヘルパー
  const handleFormChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // publicIdの重複チェック
  const checkPublicIdAvailability = async (publicId: string): Promise<boolean> => {
    if (!publicId) return false;
    
    try {
      const profilesRef = collection(db, "userProfiles");
      const q = query(profilesRef, where("publicId", "==", publicId));
      const snapshot = await getDocs(q);
      
      // 自分のプロフィールは除外
      const isAvailable = snapshot.empty || 
        (snapshot.docs.length === 1 && snapshot.docs[0].data().uid === user?.uid);
      
      return isAvailable;
    } catch (error) {
      console.error("Error checking publicId:", error);
      return false;
    }
  };

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("ログインが必要です");
      return;
    }

    // バリデーション
    if (!formData.publicId) {
      setError("プロフィールIDは必須です");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(formData.publicId)) {
      setError("プロフィールIDは英数字、ハイフン、アンダースコアのみ使用できます");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // publicIdの重複チェック
      const isAvailable = await checkPublicIdAvailability(formData.publicId);
      if (!isAvailable) {
        setError("このプロフィールIDは既に使用されています");
        setSaving(false);
        return;
      }

      let photoURL = userProfile?.photoURL;
      let coverImage = userProfile?.coverImage;

      console.log('Before processing:', { photoURL, coverImage, photoUrls, photoFile });

      // プロフィール画像のアップロード (新しい統一パイプライン使用)
      if (photoUrls.length > 0) {
        photoURL = photoUrls[0]; // 新しいパイプラインからの URL
        console.log('Using new pipeline URL:', photoURL);
      } else if (photoFile) {
        // フォールバック: 従来の直接アップロード (移行期間中)
        const photoRef = ref(storage, `users/${user.uid}/profile.jpg`);
        await uploadBytes(photoRef, photoFile);
        photoURL = await getDownloadURL(photoRef);
        console.log('Using legacy upload URL:', photoURL);
      }
      
      console.log('After processing:', { photoURL, coverImage });

      // カバー画像のアップロード
      if (coverFile) {
        const coverRef = ref(storage, `users/${user.uid}/cover.jpg`);
        await uploadBytes(coverRef, coverFile);
        coverImage = await getDownloadURL(coverRef);
      }

      // プロフィールデータの準備 - 明示的にフィールドを構築
      const profileData: any = {
        uid: user.uid,
        updatedAt: new Date(),
      };

      // formDataから明示的に必要なフィールドのみ追加
      const fieldsToInclude = [
        'publicId', 'displayName', 'username', 'bio', 'location', 
        'website', 'twitter', 'github', 'email', 'showEmail'
      ];
      
      fieldsToInclude.forEach(field => {
        const value = formData[field as keyof typeof formData];
        if (value !== undefined && value !== null && value !== '') {
          profileData[field] = value;
        }
      });

      // 画像URLは undefined でない場合のみ追加
      if (photoURL !== undefined && photoURL !== null && photoURL !== '') {
        profileData.photoURL = photoURL;
      }
      if (coverImage !== undefined && coverImage !== null && coverImage !== '') {
        profileData.coverImage = coverImage;
      }

      // Firestoreに保存
      const profileRef = doc(db, "userProfiles", user.uid);
      const profileDoc = await getDoc(profileRef);
      
      // profileDataは既に安全に構築されているが、念のため最終チェック
      const cleanedProfileData = { ...profileData };
      
      console.log('Profile data before cleaning:', profileData);
      console.log('Profile data after cleaning:', cleanedProfileData);
      
      // 最終安全チェック: undefinedが残っていないか確認
      const hasUndefinedValues = Object.entries(cleanedProfileData).some(([key, value]) => {
        if (value === undefined) {
          console.error(`ERROR: Field '${key}' still has undefined value!`, value);
          return true;
        }
        return false;
      });
      
      if (hasUndefinedValues) {
        throw new Error('Profile data contains undefined values after cleaning');
      }
      
      // 絶対的な安全措置: photoURLが存在してundefinedの場合は削除
      if ('photoURL' in cleanedProfileData && cleanedProfileData.photoURL === undefined) {
        console.warn('Removing undefined photoURL from cleaned data');
        delete cleanedProfileData.photoURL;
      }
      if ('coverImage' in cleanedProfileData && cleanedProfileData.coverImage === undefined) {
        console.warn('Removing undefined coverImage from cleaned data');
        delete cleanedProfileData.coverImage;
      }
      
      console.log('Final data being sent to Firestore:', cleanedProfileData);
      
      if (profileDoc.exists()) {
        await updateDoc(profileRef, cleanedProfileData);
      } else {
        await setDoc(profileRef, {
          ...cleanedProfileData,
          createdAt: new Date(),
        });
      }

      setSuccess(true);
      await refreshProfile();
      
      // 成功後、プロフィールページにリダイレクト
      setTimeout(() => {
        router.push(`/users/${formData.publicId}`);
      }, 1500);
      
    } catch (error) {
      console.error("Error saving profile:", error);
      setError("プロフィールの保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            ログインが必要です
          </h2>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <SettingsHeaderSection 
          onBack={() => router.back()} 
          error={error}
          success={success}
        />

        {/* マイグレーション提案バナー */}
        {showMigrationSuggestion && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5">
                ℹ️
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900 mb-1">
                  プロフィール画像の最適化が利用可能
                </h3>
                <p className="text-sm text-blue-700 mb-3">
                  新しい画像処理システムにより、プロフィール画像をより高速で安全に表示できます。新しい画像をアップロードすることで自動的に最適化されます。
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMigrationSuggestion(false)}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    後で
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMigrationSuggestion(false)}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    非表示
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMigrationSuggestion(false)}
                className="flex-shrink-0 text-blue-400 hover:text-blue-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <ImageUploadSection
            photoPreview={photoPreview}
            coverPreview={coverPreview}
            photoUrls={photoUrls}
            onPhotoUrlsChange={setPhotoUrls}
            onCoverChange={handleCoverChange}
            disabled={saving}
          />

          <ProfileFormSection
            formData={formData}
            onChange={handleFormChange}
            saving={saving}
            onCancel={() => router.back()}
          />
        </form>
      </div>
    </div>
  );
}