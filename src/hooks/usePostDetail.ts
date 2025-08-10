import { useState, useEffect } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toggleFavorite, isFavorited as checkIsFavorited } from '@/lib/favorites';
import { useAuth } from '@/hooks/useAuth';
import { env } from '@/lib/env';
import type { Post } from '@/types/Post';

interface UsePostDetailProps {
  post: Post | null;
  postId: string;
  refetch: () => void;
}

interface UsePostDetailReturn {
  isFavorited: boolean;
  handleFavorite: () => Promise<void>;
  isUpdatingFavorite: boolean;
}

export const usePostDetail = ({ 
  post, 
  postId, 
  refetch 
}: UsePostDetailProps): UsePostDetailReturn => {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);

  // ビュー数の更新とお気に入り状態の取得
  useEffect(() => {
    const updateViewsAndFavorites = async () => {
      if (!post || !postId) return;

      try {
        // ビュー数を増加（1回だけ）
        const docRef = doc(db, 'posts', postId);
        await updateDoc(docRef, {
          views: increment(1)
        });

        // お気に入り状態の確認
        if (user) {
          const fav = await checkIsFavorited(postId, user.uid);
          setIsFavorited(fav);
        }
      } catch (err) {
        console.error('View count update failed:', err);
      }
    };

    updateViewsAndFavorites();
  }, [post, postId, user]);

  const handleFavorite = async () => {
    if (!post || !user || isUpdatingFavorite) return;
    
    setIsUpdatingFavorite(true);
    
    try {
      // reCAPTCHA待機処理を最適化
      if (!window.grecaptcha) {
        await new Promise<void>((resolve) => {
          const checkRecaptcha = () => {
            if (window.grecaptcha) {
              resolve();
            } else {
              setTimeout(checkRecaptcha, 100);
            }
          };
          checkRecaptcha();
        });
      }
      
      if (!env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
        throw new Error('reCAPTCHA site key not configured');
      }
      
      const token = await window.grecaptcha?.execute(
        env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
        { action: 'favorite' }
      );
      
      if (!token) {
        throw new Error('Failed to get reCAPTCHA token');
      }
      
      await toggleFavorite(post.id, isFavorited, token);
      refetch();
      setIsFavorited(!isFavorited);
      
    } catch (error) {
      console.error('Favorite operation failed:', error);
      alert(`お気に入り操作に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  return {
    isFavorited,
    handleFavorite,
    isUpdatingFavorite,
  };
};