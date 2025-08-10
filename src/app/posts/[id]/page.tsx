'use client';

import { Suspense } from 'react';
import { useFirestoreDocument } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePostDetail } from '@/hooks/usePostDetail';
import { ImageGallery } from '@/components/ui/ImageGallery';
import { PostHeader } from '@/components/posts/PostHeader';
import { PostContent } from '@/components/posts/PostContent';
import { PostSidebar } from '@/components/posts/PostSidebar';
import type { Post } from '@/types/Post';

// ローディングコンポーネント
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">投稿を読み込み中...</p>
    </div>
  </div>
);

// エラーコンポーネント
interface ErrorStateProps {
  error?: string;
  onRetry: () => void;
  onGoHome: () => void;
}

const ErrorState = ({ error, onRetry, onGoHome }: ErrorStateProps) => (
  <div className="flex items-center justify-center py-20">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-foreground mb-4">
        {error || '投稿が見つかりません'}
      </h1>
      <div className="space-x-4">
        <button
          onClick={onRetry}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          再試行
        </button>
        <button
          onClick={onGoHome}
          className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
        >
          ホームに戻る
        </button>
      </div>
    </div>
  </div>
);

// 戻るボタンコンポーネント
const BackButton = ({ onBack }: { onBack: () => void }) => (
  <button
    onClick={onBack}
    className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors ml-2"
    aria-label="前のページに戻る"
  >
    <ArrowLeft size={20} />
    <span className="text-base font-medium">戻る</span>
  </button>
);

// メインコンポーネント
export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const postId = params.id as string;

  // データ取得
  const { data: post, loading, error, refetch } = useFirestoreDocument<Post>(
    'posts',
    postId
  );

  // 投稿詳細のロジック
  const { isFavorited, handleFavorite, isUpdatingFavorite } = usePostDetail({
    post,
    postId,
    refetch,
  });

  // ハンドラー
  const handleRetry = () => refetch();
  const handleGoHome = () => router.push('/');
  const handleGoBack = () => router.back();

  // ローディング状態
  if (loading) {
    return <LoadingSpinner />;
  }

  // エラー状態
  if (error || !post) {
    return (
      <ErrorState
        error={error}
        onRetry={handleRetry}
        onGoHome={handleGoHome}
      />
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-6xl mx-auto px-2 pt-3 space-y-6">
        {/* 戻るボタン */}
        <BackButton onBack={handleGoBack} />
        
        {/* 投稿ヘッダー */}
        <PostHeader
          post={post}
          isFavorited={isFavorited}
          isUpdatingFavorite={isUpdatingFavorite}
          onFavoriteClick={handleFavorite}
          userLoggedIn={!!user}
        />

        {/* 画像ギャラリー */}
        <Suspense fallback={<div className="bg-card rounded-xl h-64 animate-pulse" />}>
          <ImageGallery
            images={post.images}
            thumbnailUrl={post.thumbnailUrl}
            title={post.title}
          />
        </Suspense>

        {/* メインコンテンツ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <PostContent post={post} />
          <PostSidebar post={post} />
        </div>
      </div>
    </div>
  );
}