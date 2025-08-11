'use client';

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useUserProfile } from "@/hooks/useUserProfile";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

      // プロフィール画像のアップロード
      if (photoFile) {
        const photoRef = ref(storage, `users/${user.uid}/profile.jpg`);
        await uploadBytes(photoRef, photoFile);
        photoURL = await getDownloadURL(photoRef);
      }

      // カバー画像のアップロード
      if (coverFile) {
        const coverRef = ref(storage, `users/${user.uid}/cover.jpg`);
        await uploadBytes(coverRef, coverFile);
        coverImage = await getDownloadURL(coverRef);
      }

      // プロフィールデータの準備
      const profileData = {
        uid: user.uid,
        ...formData,
        photoURL,
        coverImage,
        updatedAt: new Date(),
      };

      // Firestoreに保存
      const profileRef = doc(db, "userProfiles", user.uid);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        await updateDoc(profileRef, profileData);
      } else {
        await setDoc(profileRef, {
          ...profileData,
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

        <form onSubmit={handleSubmit} className="space-y-8">
          <ImageUploadSection
            photoPreview={photoPreview}
            coverPreview={coverPreview}
            onPhotoChange={handlePhotoChange}
            onCoverChange={handleCoverChange}
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