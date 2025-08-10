"use client";

import { useState, useEffect, useRef } from "react";
import { useFirestoreDocument } from '@/lib/api';
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toggleFavorite, isFavorited as checkIsFavorited } from "@/lib/favorites";
import { useAuth } from "@/hooks/useAuth";

import { TagChip } from "@/components/ui/TagChip";
import Image from "next/image";
import { 
  Heart, 
  ArrowLeft,
  Award,
  Globe,
  Users,
  BarChart3,
  Zap,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import type { Post } from "@/types/Post";
import { formatDate } from '@/lib/utils/date';
import { findCategoryById } from '@/lib/constants/categories';
import { env } from '@/lib/env';

declare global {
  interface Window {
    grecaptcha?: {
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

// ヘルパー関数
const getCategoryName = (post: Post): string => {
  const category = post.categoryId ? findCategoryById(post.categoryId) : null;
  return category?.name || post.customCategory || 'その他';
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const postId = params.id as string;

  // Firestoreから直接データ取得
  const { data: post, loading, error, refetch } = useFirestoreDocument<Post>(
    'posts',
    postId
  );

  useEffect(() => {
    const updateViewsAndFavorites = async () => {
      if (!post || !postId) return;

      try {
        // ビュー数を増加（1回だけ）
        const docRef = doc(db, "posts", postId);
        await updateDoc(docRef, {
          views: increment(1)
        });

        if (user) {
          const fav = await checkIsFavorited(postId, user.uid);
          setIsFavorited(fav);
        }
      } catch (err) {
        console.error("View count update failed:", err);
      }
    };

    updateViewsAndFavorites();
  }, [post, postId, user]);

  // スライダー機能の実装
  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const imageWidth = 400; // 画像の幅（適度なサイズ）
      const gap = 16; // gap-4 = 16px
      scrollContainerRef.current.scrollBy({
        left: -(imageWidth + gap),
        behavior: 'smooth'
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const imageWidth = 400;
      const gap = 16;
      scrollContainerRef.current.scrollBy({
        left: (imageWidth + gap),
        behavior: 'smooth'
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  // 初期化時にスクロールボタンの状態をチェック
  useEffect(() => {
    if (post?.images && post.images.length > 0) {
      const timer = setTimeout(checkScrollButtons, 100);
      return () => clearTimeout(timer);
    }
  }, [post?.images]);

  // ウィンドウリサイズ時にスクロールボタンの状態を更新
  useEffect(() => {
    const handleResize = () => {
      checkScrollButtons();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleFavorite = async () => {
    if (!post || !user) return;
    
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
        throw new Error("reCAPTCHA site key not configured");
      }
      
      const token = await window.grecaptcha?.execute(
        env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
        { action: "favorite" }
      );
      
      if (!token) {
        throw new Error("Failed to get reCAPTCHA token");
      }
      
      await toggleFavorite(post.id, isFavorited, token);
      refetch();
      setIsFavorited(!isFavorited);
      
    } catch (error) {
      console.error("Favorite operation failed:", error);
      alert(`お気に入り操作に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">投稿を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {error || "投稿が見つかりません"}
          </h1>
          <div className="space-x-4">
            <button
              onClick={refetch}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
            >
              再試行
            </button>
            <button
              onClick={() => router.push("/")}
              className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
        <div className="max-w-6xl mx-auto px-2 pt-3">
          {/* 戻るボタン */}
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors ml-2"
          >
            <ArrowLeft size={20} />
            <span className="text-base font-medium">戻る</span>
          </button>
          
          {/* アプリストア風ヘッダーセクション */}
          <div className="bg-card rounded-xl overflow-hidden">
            <div className="p-3">
              <div className="flex flex-col">
                {/* アプリ詳細 */}
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
                    <div className="flex flex-row gap-3 lg:justify-end">
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        <span>開く</span>
                      </a>
                      
                      <button
                        onClick={handleFavorite}
                        disabled={!user}
                        className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                          isFavorited
                            ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                            : "bg-card border-border text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <span>{isFavorited ? 'お気に入り' : 'お気に入り'}</span>
                      </button>

                      <button className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold bg-card border border-border text-foreground hover:bg-muted/50 transition-colors">
                        <span>共有</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 画像ギャラリー（スライダー表示） */}
          {((post.images && post.images.length > 0) || post.thumbnailUrl) && (
            <div className="bg-card rounded-xl overflow-hidden">
              <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
                {/* 左矢印 */}
                {canScrollLeft && post.images && post.images.length > 1 && (
                  <button
                    onClick={scrollLeft}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border border-border rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-105"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                
                {/* 右矢印 */}
                {canScrollRight && post.images && post.images.length > 1 && (
                  <button
                    onClick={scrollRight}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border border-border rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-105"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}

                {/* スクロールコンテナ */}
                <div 
                  ref={scrollContainerRef}
                  className="overflow-x-auto scrollbar-hide"
                  onScroll={checkScrollButtons}
                >
                  <div className="flex gap-4 pb-4 px-4 sm:px-6 lg:px-8 min-w-max">
                    {post.images && post.images.length > 0 ? (
                      post.images.map((imageUrl, index) => (
                        <div key={index} className="w-96 flex-shrink-0">
                          <div className="relative aspect-[5/3] bg-muted rounded-lg overflow-hidden border border-black/20">
                            <Image
                              src={imageUrl}
                              alt={`${post.title} - 画像 ${index + 1}`}
                              fill
                              loading="lazy"
                              className="object-cover"
                            />
                          </div>
                        </div>
                      ))
                    ) : post.thumbnailUrl && (
                      <div className="w-96 flex-shrink-0">
                        <div className="relative aspect-[5/3] bg-muted rounded-lg overflow-hidden border border-black/20">
                          <Image
                            src={post.thumbnailUrl}
                            alt={`${post.title} - サムネイル`}
                            fill
                            loading="lazy"
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 詳細情報セクション */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* メインコンテンツ */}
            <div className="lg:col-span-2 space-y-8">

              {/* 説明セクション */}
              <div className="bg-card rounded-xl  p-3">
                <h2 className="text-xl font-bold text-foreground mb-4">説明</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {post.description}
                </p>
              </div>

              {/* 詳細情報（任意項目のみ表示） */}
              {(post.problemBackground || post.useCase || post.uniquePoints || post.futureIdeas) && (
                <div className="bg-card rounded-xl  p-3">
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
                <div className="bg-card rounded-xl  p-3">
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

            {/* サイドバー */}
            <div className="space-y-6">
              {/* アプリ情報 */}
              <div className="bg-white rounded-xl  border border-gray-200 p-3">
                <h3 className="text-lg font-bold text-foreground mb-4">情報</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">作成者</span>
                    <span className="font-medium text-foreground">{post.authorUsername}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">公開日</span>
                    <span className="text-foreground">{formatDate(post.createdAt, { fallback: '不明' })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">更新日</span>
                    <span className="text-foreground">{formatDate(post.updatedAt, { fallback: '不明' })}</span>
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