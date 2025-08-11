import { NextRequest } from 'next/server';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createErrorResponse, createSuccessResponse, getClientIP } from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { Post } from '@/types/Post';

interface RelatedPost extends Omit<Post, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt?: Date;
  score: number; // 関連度スコア
}

/**
 * ハイブリッド推薦アルゴリズム
 * 1. カテゴリマッチ: 同じカテゴリの作品をフィルタ
 * 2. タグマッチ: 共通タグを持つ作品にスコア付与
 * 3. 人気順ソート: favoriteCount + views で最終ソート
 */
function calculateRelatedScore(currentPost: Post, candidatePost: RelatedPost): number {
  let score = 0;
  
  // カテゴリマッチ (基本スコア)
  if (currentPost.categoryId === candidatePost.categoryId) {
    score += 10;
  }
  
  // タグマッチ (共通タグ数に応じてスコア追加)
  const currentTags = currentPost.tagIds || [];
  const candidateTags = candidatePost.tagIds || [];
  const commonTags = currentTags.filter(tag => candidateTags.includes(tag));
  score += commonTags.length * 5;
  
  // 人気度スコア (favoriteCount + views)
  const popularityScore = (candidatePost.favoriteCount || 0) + (candidatePost.views || 0);
  score += popularityScore * 0.1; // 0.1倍で重み調整
  
  return score;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    
    // IP アドレスを取得してレート制限チェック
    const ip = getClientIP(request);
    
    if (!(await checkRateLimit(ip))) {
      return createErrorResponse(
        'rate_limited',
        'リクエストが多すぎます。しばらく待ってからお試しください',
        429
      );
    }

    // 現在の投稿を取得
    const currentPostQuery = query(
      collection(db, 'posts'),
      where('__name__', '==', postId)
    );
    const currentPostSnapshot = await getDocs(currentPostQuery);
    
    if (currentPostSnapshot.empty) {
      return createErrorResponse(
        'not_found',
        '投稿が見つかりません',
        404
      );
    }
    
    const currentPostData = currentPostSnapshot.docs[0].data();
    const currentPost: Post = {
      id: currentPostSnapshot.docs[0].id,
      title: currentPostData.title || '',
      url: currentPostData.url || '',
      description: currentPostData.description || '',
      tagIds: currentPostData.tagIds || [],
      categoryId: currentPostData.categoryId || 'other',
      customCategory: currentPostData.customCategory,
      authorId: currentPostData.authorId || '',
      authorUsername: currentPostData.authorUsername || '',
      authorPublicId: currentPostData.authorPublicId || '',
      thumbnailUrl: currentPostData.thumbnailUrl,
      images: currentPostData.images,
      imageOrder: currentPostData.imageOrder,
      ogpTitle: currentPostData.ogpTitle,
      ogpDescription: currentPostData.ogpDescription,
      ogpImage: currentPostData.ogpImage,
      isPublic: currentPostData.isPublic !== false,
      createdAt: currentPostData.createdAt,
      updatedAt: currentPostData.updatedAt,
      likes: currentPostData.likes || 0,
      favoriteCount: currentPostData.favoriteCount || 0,
      views: currentPostData.views || 0,
      featured: currentPostData.featured || false,
      problemBackground: currentPostData.problemBackground,
      useCase: currentPostData.useCase,
      uniquePoints: currentPostData.uniquePoints,
      futureIdeas: currentPostData.futureIdeas,
      acceptInterview: currentPostData.acceptInterview || false,
    };

    // 第一優先: タグマッチ（全カテゴリから）
    let relatedPosts: RelatedPost[] = [];
    
    if (currentPost.tagIds.length > 0) {
      const tagMatchQuery = query(
        collection(db, 'posts'),
        where('isPublic', '==', true),
        limit(30) // 多めに取得してフィルタリング
      );
      
      const tagMatchSnapshot = await getDocs(tagMatchQuery);
      
      relatedPosts = tagMatchSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          return (
            doc.id !== postId && // 現在の投稿除外
            (data.tagIds || []).some((tagId: string) => currentPost.tagIds.includes(tagId)) // タグマッチ
          );
        })
        .map(doc => {
          const data = doc.data();
          const post: RelatedPost = {
            id: doc.id,
            title: data.title || '',
            url: data.url || '',
            description: data.description || '',
            tagIds: data.tagIds || [],
            categoryId: data.categoryId || 'other',
            customCategory: data.customCategory,
            authorId: data.authorId || '',
            authorUsername: data.authorUsername || '',
            authorPublicId: data.authorPublicId || '',
            thumbnailUrl: data.thumbnailUrl,
            images: data.images,
            imageOrder: data.imageOrder,
            ogpTitle: data.ogpTitle,
            ogpDescription: data.ogpDescription,
            ogpImage: data.ogpImage,
            isPublic: data.isPublic !== false,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate(),
            likes: data.likes || 0,
            favoriteCount: data.favoriteCount || 0,
            views: data.views || 0,
            featured: data.featured || false,
            problemBackground: data.problemBackground,
            useCase: data.useCase,
            uniquePoints: data.uniquePoints,
            futureIdeas: data.futureIdeas,
            acceptInterview: data.acceptInterview || false,
            score: 0
          };
          
          post.score = calculateRelatedScore(currentPost, post);
          return post;
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
    }

    // 第二優先: 同じカテゴリの作品で補完
    if (relatedPosts.length < 6) {
      const categoryQuery = query(
        collection(db, 'posts'),
        where('isPublic', '==', true),
        where('categoryId', '==', currentPost.categoryId),
        limit(20)
      );
      
      const categorySnapshot = await getDocs(categoryQuery);
      
      const existingIds = new Set(relatedPosts.map(p => p.id));
      existingIds.add(postId); // 現在の投稿も除外
      
      const categoryPosts = categorySnapshot.docs
        .filter(doc => !existingIds.has(doc.id)) // 既に追加済みの投稿を除外
        .map(doc => {
          const data = doc.data();
          const post: RelatedPost = {
            id: doc.id,
            title: data.title || '',
            url: data.url || '',
            description: data.description || '',
            tagIds: data.tagIds || [],
            categoryId: data.categoryId || 'other',
            customCategory: data.customCategory,
            authorId: data.authorId || '',
            authorUsername: data.authorUsername || '',
            authorPublicId: data.authorPublicId || '',
            thumbnailUrl: data.thumbnailUrl,
            images: data.images,
            imageOrder: data.imageOrder,
            ogpTitle: data.ogpTitle,
            ogpDescription: data.ogpDescription,
            ogpImage: data.ogpImage,
            isPublic: data.isPublic !== false,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate(),
            likes: data.likes || 0,
            favoriteCount: data.favoriteCount || 0,
            views: data.views || 0,
            featured: data.featured || false,
            problemBackground: data.problemBackground,
            useCase: data.useCase,
            uniquePoints: data.uniquePoints,
            futureIdeas: data.futureIdeas,
            acceptInterview: data.acceptInterview || false,
            score: 0
          };
          
          post.score = calculateRelatedScore(currentPost, post);
          return post;
        })
        .sort((a, b) => b.score - a.score);
      
      // 不足分を補完
      const remainingSlots = 6 - relatedPosts.length;
      relatedPosts = [...relatedPosts, ...categoryPosts.slice(0, remainingSlots)];
    }

    // まだ不足している場合、最終手段として人気作品で補完
    if (relatedPosts.length < 6) {
      const popularQuery = query(
        collection(db, 'posts'),
        where('isPublic', '==', true),
        limit(20)
      );
      
      const popularSnapshot = await getDocs(popularQuery);
      
      const existingIds = new Set(relatedPosts.map(p => p.id));
      existingIds.add(postId); // 現在の投稿も除外
      
      const popularPosts = popularSnapshot.docs
        .filter(doc => !existingIds.has(doc.id)) // 既に追加済みの投稿を除外
        .map(doc => {
          const data = doc.data();
          const post: RelatedPost = {
            id: doc.id,
            title: data.title || '',
            url: data.url || '',
            description: data.description || '',
            tagIds: data.tagIds || [],
            categoryId: data.categoryId || 'other',
            customCategory: data.customCategory,
            authorId: data.authorId || '',
            authorUsername: data.authorUsername || '',
            authorPublicId: data.authorPublicId || '',
            thumbnailUrl: data.thumbnailUrl,
            images: data.images,
            imageOrder: data.imageOrder,
            ogpTitle: data.ogpTitle,
            ogpDescription: data.ogpDescription,
            ogpImage: data.ogpImage,
            isPublic: data.isPublic !== false,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate(),
            likes: data.likes || 0,
            favoriteCount: data.favoriteCount || 0,
            views: data.views || 0,
            featured: data.featured || false,
            problemBackground: data.problemBackground,
            useCase: data.useCase,
            uniquePoints: data.uniquePoints,
            futureIdeas: data.futureIdeas,
            acceptInterview: data.acceptInterview || false,
            score: data.favoriteCount || 0 // お気に入り数をスコアとして使用
          };
          
          return post;
        })
        .sort((a, b) => b.score - a.score); // お気に入り数順でソート
      
      // 最終的な不足分を補完
      const finalRemainingSlots = 6 - relatedPosts.length;
      relatedPosts = [...relatedPosts, ...popularPosts.slice(0, finalRemainingSlots)];
    }

    // scoreフィールドを除去してレスポンス用データを作成
    const responseData = relatedPosts.map(({ score, ...post }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = score;
      return post;
    });

    console.log(`Related posts fetched for ${postId}: ${responseData.length} items - IP: ${ip}`);

    return createSuccessResponse(
      { posts: responseData, total: responseData.length },
      `${responseData.length}件の関連作品を取得しました`
    );

  } catch (error) {
    console.error('Related posts fetch error:', error);
    
    return createErrorResponse(
      'server_error',
      '関連作品の取得に失敗しました',
      500
    );
  }
}

// CORS対応
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}