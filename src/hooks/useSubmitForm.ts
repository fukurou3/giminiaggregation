import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { postSchema, type PostFormData } from "@/lib/schemas/postSchema";

interface OgpData {
  title?: string;
  description?: string;
  image?: string;
}

interface UrlValidation {
  isValidating: boolean;
  isValid: boolean | null;
  message?: string;
  ogpData?: OgpData;
}

interface UseSubmitFormReturn {
  formData: Partial<PostFormData>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  submitSuccess: boolean;
  handleInputChange: (field: keyof PostFormData, value: string | boolean | string[]) => void;
  validateForm: () => boolean;
  isButtonDisabled: (urlValidation: UrlValidation) => boolean;
  handleSubmit: (e: React.FormEvent, urlValidation: UrlValidation, customSectionData?: {[key: string]: string}, customSections?: {id: string, title: string}[]) => Promise<void>;
}

export function useSubmitForm(): UseSubmitFormReturn {
  const { user } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState<Partial<PostFormData>>({
    title: "",
    url: "",
    description: "",
    tagIds: [],
    categoryId: "",
    thumbnail: "",
    prImages: [],
    isPublic: true,
  });
  

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleInputChange = (
    field: keyof PostFormData,
    value: string | boolean | string[]
  ) => {
    // Fields that should preserve newlines (textarea fields)
    const multilineFields = ['description', 'problemBackground', 'useCase', 'uniquePoints', 'futureIdeas'];
    
    const processedValue = typeof value === "string" && !multilineFields.includes(field) 
      ? value.trim() 
      : value;
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    try {
      postSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      const newErrors: Record<string, string> = {};
      if (error instanceof Error && 'errors' in error) {
        const zodError = error as { errors: Array<{ path: string[]; message: string }> };
        zodError.errors?.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0]] = err.message;
          }
        });
      }
      setErrors(newErrors);
      return false;
    }
  };

  const isButtonDisabled = (urlValidation: UrlValidation): boolean => {
    return Boolean(
      isSubmitting || 
      submitSuccess || 
      urlValidation.isValidating || 
      (formData.url && formData.url.trim() && urlValidation.isValid === false)
    );
  };

  const handleSubmit = async (e: React.FormEvent, urlValidation: UrlValidation, customSectionData?: {[key: string]: string}, customSections?: {id: string, title: string}[]): Promise<void> => {
    e.preventDefault();
    
    if (!user) {
      alert("ログインが必要です");
      return;
    }

    if (!validateForm()) {
      return;
    }
    
    if (formData.url && formData.url.trim()) {
      if (urlValidation.isValidating) {
        alert("URLの確認中です。しばらくお待ちください。");
        return;
      }
      
      if (urlValidation.isValid !== true) {
        const errorMessage = urlValidation.message || 
          "有効なGemini共有リンクを入力してください。";
        alert(errorMessage);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // blob URLをFirebase Storage URLに変換
      let finalThumbnail = formData.thumbnail;
      let finalPrImages = formData.prImages || [];
      
      // サムネイル画像のアップロード
      if (finalThumbnail && finalThumbnail.startsWith('blob:')) {

        const response = await fetch(finalThumbnail);
        const blob = await response.blob();
        const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
        
        const { uploadImageToStorage } = await import('@/lib/utils/storageUtils');
        const uploadResult = await uploadImageToStorage(file, {
          userId: user.uid,
          folder: 'post-images',
          mode: 'thumbnail'
        });
        finalThumbnail = uploadResult.url;

      }
      
      // PR画像のアップロード
      if (finalPrImages.length > 0) {

        const uploadPromises = finalPrImages.map(async (imageUrl, index) => {
          if (imageUrl.startsWith('blob:')) {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], `pr-image-${index}.jpg`, { type: 'image/jpeg' });
            
            const { uploadImageToStorage } = await import('@/lib/utils/storageUtils');
            const uploadResult = await uploadImageToStorage(file, {
              userId: user.uid,
              folder: 'post-images',
              mode: 'pr'
            });
            return uploadResult.url;
          }
          return imageUrl;
        });
        
        finalPrImages = await Promise.all(uploadPromises);

      }
      
      // カスタムセクションデータを処理
      const processedCustomSections = customSections && customSectionData 
        ? customSections
            .filter(section => customSectionData[section.id]?.trim()) // 内容があるもののみ
            .map(section => ({
              id: section.id,
              title: section.title,
              content: customSectionData[section.id].trim()
            }))
        : undefined;
      
      // Firebase認証トークンを取得
      const token = await user.getIdToken();
      
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          formData: {
            ...formData,
            thumbnail: finalThumbnail,
            prImages: finalPrImages,
            customSections: processedCustomSections,
          },
          userInfo: {
            uid: user.uid,
          },
          ogpData: urlValidation.ogpData,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.error === 'validation_failed' && result.details) {
          const errorMessages = result.details.map((detail: { field: string; message: string }) => detail.message).join('\n');
          alert(`入力エラー:\n${errorMessages}`);
        } else if (result.error === 'rate_limited') {
          alert('投稿が多すぎます。しばらく待ってからお試しください。');
        } else if (result.error === 'invalid_url') {
          alert(`URL エラー: ${result.message}`);
        } else {
          alert(result.message || '投稿に失敗しました。もう一度お試しください。');
        }
        return;
      }

      setSubmitSuccess(true);
      
      if (result.postId) {
        setTimeout(() => {
          router.push(`/posts/${result.postId}`);
        }, 1500);
      } else {
        setTimeout(() => {
          router.push("/");
        }, 1500);
      }
      
    } catch (error) {
      console.error("投稿エラー:", error);
      if (error instanceof Error && error.name === 'TypeError') {
        alert("ネットワークエラーが発生しました。インターネット接続を確認してください。");
      } else {
        alert("投稿に失敗しました。もう一度お試しください。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    isSubmitting,
    submitSuccess,
    handleInputChange,
    validateForm,
    isButtonDisabled,
    handleSubmit,
  };
}