'use client';

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useUserProfile } from "@/hooks/useUserProfile";
import { 
  ArrowLeft,
  Camera,
  Loader2,
  Save,
  User,
  Mail,
  MapPin,
  Link as LinkIcon,
  Twitter,
  Github,
  FileText,
  AlertCircle
} from "lucide-react";
import Image from "next/image";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const { userProfile, refreshProfile } = useUserProfile();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
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
        {/* ヘッダー */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="戻る"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">プロフィール設定</h1>
        </div>

        {/* エラー/成功メッセージ */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">プロフィールを保存しました</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* カバー画像 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              カバー画像
            </label>
            <div className="relative h-32 sm:h-48 bg-muted rounded-lg overflow-hidden">
              {coverPreview ? (
                <Image
                  src={coverPreview}
                  alt="カバー画像"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="h-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500" />
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <div className="text-white text-center">
                  <Camera className="w-8 h-8 mx-auto mb-2" />
                  <span className="text-sm">カバー画像を変更</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* プロフィール画像 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              プロフィール画像
            </label>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-muted">
                {photoPreview ? (
                  <Image
                    src={photoPreview}
                    alt="プロフィール画像"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary">
                    <User className="w-12 h-12 text-primary-foreground" />
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

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
                onChange={(e) => setFormData({ ...formData, publicId: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={4}
              placeholder="あなたについて教えてください"
              maxLength={500}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              {formData.bio.length}/500
            </p>
          </div>

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
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://example.com"
            />
          </div>

          {/* ソーシャルリンク */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">ソーシャルリンク</h3>
            
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
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="username"
              />
            </div>
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
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="email@example.com"
            />
            <div className="mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.showEmail}
                  onChange={(e) => setFormData({ ...formData, showEmail: e.target.checked })}
                  className="rounded border-border"
                />
                <span className="text-sm text-muted-foreground">
                  プロフィールにメールアドレスを表示する
                </span>
              </label>
            </div>
          </div>

          {/* 送信ボタン */}
          <div className="flex gap-4">
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
              onClick={() => router.back()}
              className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}