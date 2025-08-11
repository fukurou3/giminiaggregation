'use client';

import { Suspense } from 'react';
import { useFirestoreDocument } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Globe, BarChart3, Users, Zap, Sparkles, Award } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePostDetail } from '@/hooks/usePostDetail';
import { ImageGallery } from '@/components/ui/ImageGallery';
import { PostActions } from '@/components/posts/PostActions';
import { TagChip } from '@/components/ui/TagChip';
import { formatDate } from '@/lib/utils/date';
import { findCategoryById } from '@/lib/constants/categories';
import Link from 'next/link';
import type { Post } from '@/types/Post';
import type { UserProfile } from '@/types/UserProfile';

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

  // 作成者のユーザー情報を取得
  const { data: authorProfile } = useFirestoreDocument<UserProfile>(
    'userProfiles',
    post?.authorId || ''
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

  // カテゴリ名取得
  const getCategoryName = (post: Post): string => {
    const category = post.categoryId ? findCategoryById(post.categoryId) : null;
    return category?.name || post.customCategory || 'その他';
  };

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
        <div className="bg-card rounded-xl overflow-hidden">
          <div className="p-3">
            <div className="flex flex-col">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col lg:flex-row lg:items-start gap-3 mb-6">
                  <div className="flex-1">
                    <h1 className="text-xl font-semibold text-foreground mb-2 leading-tight">
                      {post.title}
                    </h1>

                    {/* カテゴリとタグ */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      <Link 
                        href={`/categories?category=${post.categoryId || 'other'}`}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors cursor-pointer"
                      >
                        {getCategoryName(post)}
                      </Link>
                      {post.tagIds?.map((tagId) => (
                        <TagChip
                          key={`tagid-${tagId}`}
                          tag={{ 
                            id: tagId, 
                            name: tagId.replace(/_/g, ' '),
                            aliases: [], 
                            count: 0, 
                            isOfficial: false, 
                            views: 0, 
                            favorites: 0, 
                            flagged: false,
                            createdAt: new Date(),
                            updatedAt: new Date()
                          }}
                          size="sm"
                          variant="outlined"
                        />
                      ))}
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <PostActions
                    postUrl={post.url}
                    isFavorited={isFavorited}
                    isUpdatingFavorite={isUpdatingFavorite}
                    onFavoriteClick={handleFavorite}
                    userLoggedIn={!!user}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

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
          {/* 左側：投稿内容 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 説明セクション */}
            <div className="bg-card rounded-xl p-3">
              <h2 className="text-xl font-bold text-foreground mb-4">説明</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {post.description}
              </p>
            </div>

            {/* 詳細情報（任意項目のみ表示） */}
            {(post.problemBackground || post.useCase || post.uniquePoints || post.futureIdeas) && (
              <div className="bg-card rounded-xl p-3">
                <h2 className="text-xl font-bold text-foreground mb-6">詳細情報</h2>
                <div className="space-y-6">
                  {post.problemBackground && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
                        <BarChart3 size={20} className="mr-2 text-blue-600" />
                        課題・背景
                      </h3>
                      <p className="text-foreground leading-relaxed">{post.problemBackground}</p>
                    </div>
                  )}
                  {post.useCase && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
                        <Users size={20} className="mr-2 text-green-600" />
                        想定シーン・利用者
                      </h3>
                      <p className="text-foreground leading-relaxed">{post.useCase}</p>
                    </div>
                  )}
                  {post.uniquePoints && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
                        <Zap size={20} className="mr-2 text-purple-600" />
                        差別化ポイント
                      </h3>
                      <p className="text-foreground leading-relaxed">{post.uniquePoints}</p>
                    </div>
                  )}
                  {post.futureIdeas && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
                        <Sparkles size={20} className="mr-2 text-amber-600" />
                        応用・発展アイデア
                      </h3>
                      <p className="text-foreground leading-relaxed">{post.futureIdeas}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* OGP情報 */}
            {post.ogpTitle && post.ogpTitle !== post.title && (
              <div className="bg-card rounded-xl p-3">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center">
                  <Globe size={20} className="mr-2 text-blue-600" />
                  Canvas情報
                </h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">タイトル</span>
                    <p className="text-foreground">{post.ogpTitle}</p>
                  </div>
                  {post.ogpDescription && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">説明</span>
                      <p className="text-foreground">{post.ogpDescription}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 右側：サイドバー */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <h3 className="text-lg font-bold text-foreground mb-4">情報</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">作成者</span>
                  {authorProfile?.publicId ? (
                    <Link 
                      href={`/users/${authorProfile.publicId}`}
                      className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer underline-offset-4 hover:underline"
                    >
                      {post.authorUsername}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{post.authorUsername}</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">公開日</span>
                  <span className="text-foreground">
                    {formatDate(post.createdAt, { fallback: '不明' })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">更新日</span>
                  <span className="text-foreground">
                    {formatDate(post.updatedAt, { fallback: '不明' })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">カテゴリ</span>
                  <span className="text-foreground">
                    {getCategoryName(post)}
                  </span>
                </div>
                {post.featured && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">注目</span>
                    <div className="flex items-center text-amber-600">
                      <Award size={16} className="mr-1" />
                      <span className="font-medium">おすすめ</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}