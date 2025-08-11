import { useState, useEffect } from 'react';
import { Post } from '@/types/Post';

interface UseRelatedPostsResult {
  relatedPosts: Post[];
  loading: boolean;
  error: string | null;
}

interface ApiResponse {
  success: boolean;
  data?: {
    posts: Post[];
    total: number;
  };
  error?: string;
  message?: string;
}

export function useRelatedPosts(postId: string): UseRelatedPostsResult {
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRelatedPosts = async () => {
      if (!postId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/posts/${postId}/related`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ApiResponse = await response.json();

        if (!isMounted) return;

        if (data.success && data.data) {
          setRelatedPosts(data.data.posts);
        } else {
          throw new Error(data.error || '関連作品の取得に失敗しました');
        }
      } catch (err) {
        if (!isMounted) return;
        
        console.error('Failed to fetch related posts:', err);
        setError(err instanceof Error ? err.message : '関連作品の取得に失敗しました');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRelatedPosts();

    return () => {
      isMounted = false;
    };
  }, [postId]);

  return {
    relatedPosts,
    loading,
    error
  };
}