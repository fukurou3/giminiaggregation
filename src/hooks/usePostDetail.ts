import { useState, useEffect } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toggleFavorite, isFavorited as checkIsFavorited, getFavoriteCount } from '@/lib/favorites';
import { useAuth } from '@/hooks/useAuth';
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
  actualFavoriteCount: number;
}

export const usePostDetail = ({ 
  post, 
  postId, 
  refetch 
}: UsePostDetailProps): UsePostDetailReturn => {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
  const [actualFavoriteCount, setActualFavoriteCount] = useState(0);

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

        // 実際のお気に入り数を取得
        const count = await getFavoriteCount(postId);
        setActualFavoriteCount(count);
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
      await toggleFavorite(post.id, isFavorited, user.uid);
      refetch();
      setIsFavorited(!isFavorited);
      
      // お気に入り数を再取得
      const count = await getFavoriteCount(post.id);
      setActualFavoriteCount(count);
      
    } catch (error) {
      console.error('Favorite operation failed:', error);
      
      // 詳細なエラー情報を取得
      let errorMessage = 'お気に入り操作に失敗しました';
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        // Firebase特有のエラーハンドリング
        if (error.message.includes('unauthenticated')) {
          errorMessage = 'ログインが必要です。再度ログインしてください。';
        } else if (error.message.includes('permission-denied')) {
          errorMessage = 'この操作を実行する権限がありません。';
        } else if (error.message.includes('internal')) {
          errorMessage = 'サーバーエラーが発生しました。しばらく時間をおいて再試行してください。';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
          errorMessage = 'ネットワークエラーです。接続を確認して再試行してください。';
        } else {
          errorMessage = `エラー: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  return {
    isFavorited,
    handleFavorite,
    isUpdatingFavorite,
    actualFavoriteCount,
  };
};