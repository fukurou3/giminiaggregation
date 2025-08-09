"use client";

import { useState, useEffect } from "react";
import { useFirestoreDocument } from '@/lib/api';
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toggleFavorite, isFavorited as checkIsFavorited } from "@/lib/favorites";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { TagChip } from "@/components/ui/TagChip";
import { 
  Heart, 
  ArrowLeft, 
  Download,
  Share2,
  Award,
  Sparkles,
  Globe,
  Users,
  BarChart3,
  Zap
} from "lucide-react";
import Image from "next/image";
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

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [shouldWrap, setShouldWrap] = useState(false);

  const postId = params.id as string;

  // Firestoreから直接データ取得
  const { data: post, loading, error, refetch } = useFirestoreDocument<Post>(
    'posts',
    postId
  );

  // ナビゲーションバーの高さに応じてレイアウト調整
  useEffect(() => {
    const checkLayout = () => {
      const screenWidth = window.innerWidth;
      
      if (screenWidth <= 416) {
        const logoWidth = 160;
        const navLinksWidth = 180;
        const searchIconWidth = 40;
        const userActionsWidth = 60;
        const minPadding = 8;
        const minGap = 12;
        
        const totalRequiredWidth = logoWidth + navLinksWidth + searchIconWidth + userActionsWidth + minPadding + (minGap * 2);
        setShouldWrap(screenWidth < totalRequiredWidth);
        return;
      }
      
      const logoWidth = 180;
      const navLinksWidth = 200;
      const searchWidth = screenWidth >= 640 ? 208 : 160;
      const userActionsWidth = 80;
      const minPadding = screenWidth >= 640 ? 16 : 8;
      const minGap = 20;
      
      const totalRequiredWidth = logoWidth + navLinksWidth + searchWidth + userActionsWidth + minPadding + (minGap * 2);
      setShouldWrap(screenWidth < totalRequiredWidth);
    };

    checkLayout();
    window.addEventListener('resize', checkLayout);
    const timer = setTimeout(checkLayout, 100);

    return () => {
      window.removeEventListener('resize', checkLayout);
      clearTimeout(timer);
    };
  }, []);

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
        console.error("ビュー数更新エラー:", err);
      }
    };

    updateViewsAndFavorites();
  }, [post, postId, user]);

  const handleFavorite = async () => {
    if (!post || !user) {
      console.warn("お気に入り操作: ポストまたはユーザーが見つかりません", { post: !!post, user: !!user });
      return;
    }
    
    try {
      console.log("お気に入り操作開始:", { postId: post.id, currentFavorited: isFavorited });
      
      // reCAPTCHAが利用可能かチェック
      if (!window.grecaptcha) {
        console.warn("reCAPTCHA not loaded, waiting...");
        // reCAPTCHAの読み込みを待つ
        await new Promise((resolve) => {
          const checkRecaptcha = () => {
            if (window.grecaptcha) {
              resolve(undefined);
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
      
      console.log("reCAPTCHA token取得成功、toggleFavorite呼び出し");
      await toggleFavorite(post.id, isFavorited, token);
      
      console.log("toggleFavorite成功、UIを更新");
      // データを再取得してUIを更新
      refetch();
      setIsFavorited(!isFavorited);
      
    } catch (error) {
      console.error("お気に入りエラー:", error);
      // ユーザーにもエラーを表示
      alert(`お気に入り操作に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">投稿を読み込み中...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={`min-h-screen bg-background ${shouldWrap ? '-mt-13' : '-mt-22'}`}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* 戻るボタン */}
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">戻る</span>
          </button>
          {/* アプリストア風ヘッダーセクション */}
          <div className="bg-card rounded-xl  overflow-hidden mb-8">
            <div className="p-8">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* アプリアイコン */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 lg:w-40 lg:h-40 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-lg flex items-center justify-center relative overflow-hidden">
                    {(post.images?.[0] || post.thumbnailUrl || post.ogpImage) ? (
                      <Image
                        src={post.images?.[0] || post.thumbnailUrl || post.ogpImage || '/placeholder.jpg'}
                        alt={post.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Sparkles size={48} className="text-white" />
                    )}
                  </div>
                </div>

                {/* アプリ詳細 */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-6">
                    <div className="flex-1">
                      <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2 leading-tight">
                        {post.title}
                      </h1>
                      <div className="flex items-center space-x-1 mb-3">
                        <span className="text-lg text-foreground font-medium">
                          {post.authorUsername}
                        </span>
                        {post.featured && (
                          <Award size={20} className="text-amber-500 ml-2" />
                        )}
                      </div>
                      

                      {/* カテゴリとタグ */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        <Link 
                          href={`/categories?category=${post.categoryId || 'other'}`}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors cursor-pointer"
                        >
                          {(() => {
                            const category = post.categoryId ? findCategoryById(post.categoryId) : null;
                            return category?.name || post.customCategory || 'その他';
                          })()}
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
                    <div className="flex flex-col space-y-3 lg:items-end">
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center space-x-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                      >
                        <Download size={20} />
                        <span>開く</span>
                      </a>
                      
                      <button
                        onClick={handleFavorite}
                        disabled={!user}
                        className={`inline-flex items-center justify-center space-x-2 px-8 py-3 rounded-xl font-semibold transition-colors border ${
                          isFavorited
                            ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                            : "bg-card border-border text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <Heart size={20} fill={isFavorited ? "currentColor" : "none"} />
                        <span>{isFavorited ? 'お気に入り済み' : 'お気に入り'}</span>
                      </button>

                      <button className="inline-flex items-center justify-center space-x-2 px-8 py-3 rounded-xl font-semibold bg-card border border-border text-foreground hover:bg-muted/50 transition-colors">
                        <Share2 size={20} />
                        <span>共有</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 詳細情報セクション */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* メインコンテンツ */}
            <div className="lg:col-span-2 space-y-8">
              {/* 画像ギャラリー */}
              {post.images && post.images.length > 1 && (
                <div className="bg-card rounded-xl p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">画像</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {post.images.map((imageUrl, index) => (
                      <div key={index} className="relative aspect-[5/3] bg-muted rounded-lg overflow-hidden">
                        <div className="absolute top-2 left-2 z-10">
                          <span className="bg-black/70 text-white text-sm font-bold px-2 py-1 rounded">
                            {index + 1}
                          </span>
                        </div>
                        <Image
                          src={imageUrl}
                          alt={`${post.title} - 画像 ${index + 1}`}
                          fill
                          loading="lazy"
                          className="object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 説明セクション */}
              <div className="bg-card rounded-xl  p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">説明</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {post.description}
                </p>
              </div>

              {/* 詳細情報（任意項目のみ表示） */}
              {(post.problemBackground || post.useCase || post.uniquePoints || post.futureIdeas) && (
                <div className="bg-card rounded-xl  p-6">
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
                <div className="bg-card rounded-xl  p-6">
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
              <div className="bg-white rounded-xl  border border-gray-200 p-6">
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
                      {(() => {
                        const category = post.categoryId ? findCategoryById(post.categoryId) : null;
                        return category?.name || post.customCategory || 'その他';
                      })()}
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
    </Layout>
  );
}