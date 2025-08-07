"use client";

import { useState, useEffect } from "react";
import { useFirestoreDocument } from '@/lib/api';
import { useParams, useRouter } from "next/navigation";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toggleFavorite, isFavorited as checkIsFavorited } from "@/lib/favorites";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { TagChip } from "@/components/ui/TagChip";
import { ExternalLink, Heart, Eye, Calendar, User, ArrowLeft } from "lucide-react";
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
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* 戻るボタン */}
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>戻る</span>
          </button>

          {/* メインコンテンツ */}
          <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            {/* ヘッダー情報 */}
            <div className="flex flex-col lg:flex-row gap-6 mb-6">
              {/* サムネイル */}
              {(post.thumbnailUrl || post.ogpImage) && (
                <div className="lg:w-1/3 relative h-48 lg:h-64">
                  <Image
                    src={post.thumbnailUrl || post.ogpImage || '/placeholder.jpg'}
                    alt={post.title}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              )}

              {/* メタ情報 */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">{post.title}</h1>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <User size={16} />
                        <span>{post.authorUsername}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar size={16} />
                        <span>{formatDate(post.createdAt, { fallback: '日付不明' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* いいね・ビューカウント */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Eye size={16} />
                      <span>{post.views}</span>
                    </div>
                    <button
                      onClick={handleFavorite}
                      disabled={!user}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-full transition-colors ${
                        isFavorited
                          ? "bg-red-100 text-red-600"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <Heart size={16} fill={isFavorited ? "currentColor" : "none"} />
                      <span>{post.favoriteCount}</span>
                    </button>
                  </div>
                </div>

                {/* カテゴリ・タグ */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm">
                    {(() => {
                      const category = post.categoryId ? findCategoryById(post.categoryId) : null;
                      return category?.name || post.customCategory || 'その他';
                    })()}
                  </span>
                  
                  {/* タグ表示 */}
                  {post.tagIds && (
                    <>
                      {/* 新しいtagIds形式のタグ */}
                      {post.tagIds && post.tagIds.map((tagId) => (
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
                    </>
                  )}
                </div>

                {/* 説明 */}
                <p className="text-muted-foreground mb-6 whitespace-pre-wrap">
                  {post.description}
                </p>

                {/* Geminiリンク */}
                <div className="flex items-center space-x-4">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <ExternalLink size={20} />
                    <span>Gemini Canvas で開く</span>
                  </a>
                </div>
              </div>
            </div>

            {/* OGPデータ表示 */}
            {post.ogpTitle && post.ogpTitle !== post.title && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">Canvas情報</h3>
                <p className="text-sm text-muted-foreground">
                  <strong>タイトル:</strong> {post.ogpTitle}
                </p>
                {post.ogpDescription && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>説明:</strong> {post.ogpDescription}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}