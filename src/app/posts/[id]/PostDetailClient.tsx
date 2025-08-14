'use client';

import { Suspense, useState } from 'react';
import { useFirestoreDocument } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Globe, Award, Settings, Flag } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePostDetail } from '@/hooks/usePostDetail';
import { ImageGallery } from '@/components/ui/ImageGallery';
import { PostActions } from '@/components/posts/PostActions';
import { TagChip } from '@/components/ui/TagChip';
import { formatDate } from '@/lib/utils/date';
import { findCategoryById } from '@/lib/constants/categories';
import Link from 'next/link';
import { RelatedPostsSection } from '@/components/sections/RelatedPostsSection';
import { useRelatedPosts } from '@/hooks/useRelatedPosts';
import { Spinner } from '@/components/ui/Spinner';
import { PostEditModal } from '@/components/posts/PostEditModal';
import { ReportPostModal } from '@/components/posts/ReportPostModal';
import type { Post } from '@/types/Post';
import type { UserProfile } from '@/types/UserProfile';
import type { CreatePostReportRequest } from '@/types/PostReport';

// ローディングコンポーネント
const LoadingSpinner = () => <Spinner />;

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
    className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors ml-2 mb-4 p-2 rounded-lg hover:bg-accent/50"
    aria-label="前のページに戻る"
  >
    <ArrowLeft size={20} />
    <span className="text-base font-medium">戻る</span>
  </button>
);

// メインクライアントコンポーネント
interface PostDetailClientProps {
  postId: string;
}

export default function PostDetailClient({ postId }: PostDetailClientProps) {
  const router = useRouter();
  const { user } = useAuth();

  // モーダル状態管理
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

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
  const { isFavorited, handleFavorite, isUpdatingFavorite, actualFavoriteCount } = usePostDetail({
    post,
    postId,
    refetch,
  });

  // 関連作品を取得
  const { relatedPosts, loading: relatedLoading } = useRelatedPosts(postId);

  // ハンドラー
  const handleRetry = () => refetch();
  const handleGoHome = () => router.push('/');
  const handleGoBack = () => router.back();

  // カテゴリ名取得
  const getCategoryName = (post: Post): string => {
    const category = post.categoryId ? findCategoryById(post.categoryId) : null;
    return category?.name || post.customCategory || 'その他';
  };

  // 通報処理
  const handleReportPost = async (reportData: CreatePostReportRequest) => {
    try {
      if (!user) {
        throw new Error('ログインが必要です');
      }

      const response = await fetch(`/api/posts/${postId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '通報の送信に失敗しました');
      }

      const result = await response.json();
      alert(result.message || '通報を受け付けました');
    } catch (error) {
      throw error; // ReportPostModalでエラーハンドリング
    }
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
      <div className="max-w-6xl mx-auto px-2 pt-3 space-y-3">
        {/* 戻るボタン */}
        <BackButton onBack={handleGoBack} />
        
        {/* 投稿ヘッダー */}
        <div className="bg-card rounded-xl overflow-hidden">
          <div className="p-3">
            <div className="flex flex-col">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col lg:flex-row lg:items-start gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h1 className="text-xl font-semibold text-foreground mb-2 leading-tight flex-1">
                        {post.title}
                      </h1>
                      
                      {/* 設定・通報アイコン */}
                      {user && (
                        <div className="flex items-center gap-2 mt-1">
                          {user.uid === post.authorId ? (
                            // 作成者の場合：設定アイコン
                            <button
                              onClick={() => setShowEditModal(true)}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                              aria-label="作品を編集"
                            >
                              <Settings size={18} />
                            </button>
                          ) : (
                            // 他のユーザーの場合：通報アイコン
                            <button
                              onClick={() => setShowReportModal(true)}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                              aria-label="作品を通報"
                            >
                              <Flag size={18} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <PostActions
                    postUrl={post.url}
                    isFavorited={isFavorited}
                    isUpdatingFavorite={isUpdatingFavorite}
                    onFavoriteClick={handleFavorite}
                    userLoggedIn={!!user}
                    favoriteCount={actualFavoriteCount}
                    title={post.title}
                    description={post.description}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 画像ギャラリー */}
        {post.thumbnail && (
          <Suspense fallback={<div className="bg-card rounded-xl h-64 animate-pulse" />}>
            <ImageGallery
              thumbnail={post.thumbnail}
              prImages={post.prImages}
              title={post.title}
            />
          </Suspense>
        )}

        {/* カテゴリとタグ */}
        <div className="space-y-2">
          {/* カテゴリ */}
          <div>
            <Link 
              href={`/categories?category=${post.categoryId || 'other'}`}
              className="text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium cursor-pointer"
            >
              {getCategoryName(post)}
            </Link>
          </div>

          {/* タグ */}
          {post.tagIds && post.tagIds.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {post.tagIds.map((tagId) => (
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
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  }}
                  size="md"
                  variant="outlined"
                />
              ))}
            </div>
          )}
        </div>

        {/* メインコンテンツ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側：投稿内容 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 作品概要セクション */}
            <div className="bg-card rounded-xl p-3">
              <h3 className="text-lg font-semibold text-foreground mb-2">作品概要</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {post.description}
              </p>
            </div>

            {/* 詳細情報（任意項目のみ表示） */}
            {(post.problemBackground || post.useCase || post.uniquePoints || post.futureIdeas || (post.customSections && post.customSections.length > 0)) && (
              <div className="bg-card rounded-xl p-3">
                <div className="space-y-6">
                  {post.problemBackground && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        課題・背景
                      </h3>
                      <p className="text-foreground leading-relaxed">{post.problemBackground}</p>
                    </div>
                  )}
                  {post.useCase && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        想定シーン・利用者
                      </h3>
                      <p className="text-foreground leading-relaxed">{post.useCase}</p>
                    </div>
                  )}
                  {post.uniquePoints && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        差別化ポイント
                      </h3>
                      <p className="text-foreground leading-relaxed">{post.uniquePoints}</p>
                    </div>
                  )}
                  {post.futureIdeas && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        応用・発展アイデア
                      </h3>
                      <p className="text-foreground leading-relaxed">{post.futureIdeas}</p>
                    </div>
                  )}
                  {/* カスタムセクション */}
                  {post.customSections?.map((section) => (
                    <div key={section.id}>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {section.title}
                      </h3>
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">{section.content}</p>
                    </div>
                  ))}
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
                      className="font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer underline-offset-4 hover:underline"
                    >
                      {post.authorUsername}
                    </Link>
                  ) : (
                    <span className="font-medium text-blue-600">{post.authorUsername}</span>
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

        {/* おすすめの作品セクション */}
        <RelatedPostsSection
          posts={relatedPosts}
          loading={relatedLoading}
        />
      </div>

      {/* 作品編集モーダル */}
      {showEditModal && (
        <PostEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          post={post}
          onUpdate={refetch}
        />
      )}

      {/* 作品通報モーダル */}
      {showReportModal && (
        <ReportPostModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetPostId={postId}
          targetPostTitle={post.title}
          onSubmit={handleReportPost}
        />
      )}
    </div>
  );
}