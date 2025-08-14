import { Suspense } from 'react';
import { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { findCategoryById } from '@/lib/constants/categories';
import type { Post } from '@/types/Post';
import PostDetailClient from './PostDetailClient';
import { StructuredData } from '@/components/seo/StructuredData';

// Firestoreから投稿データを取得
async function getPost(id: string): Promise<Post | null> {
  try {
    const docRef = doc(db, 'posts', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Convert Firestore timestamps to ISO strings for client components
      const convertTimestamps = (obj: any): any => {
        if (obj && typeof obj === 'object') {
          if (obj.toDate && typeof obj.toDate === 'function') {
            return obj.toDate().toISOString();
          }
          if (Array.isArray(obj)) {
            return obj.map(convertTimestamps);
          }
          const converted: any = {};
          for (const [key, value] of Object.entries(obj)) {
            converted[key] = convertTimestamps(value);
          }
          return converted;
        }
        return obj;
      };

      const convertedData = convertTimestamps(data);
      return { id: docSnap.id, ...convertedData } as Post;
    }
    return null;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

// OGPメタデータを生成（サーバーサイド）
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  
  if (!post) {
    return {
      title: '投稿が見つかりません - AI活用創作フォーラム',
      description: 'お探しの投稿は見つかりませんでした。',
    };
  }

  const category = post.categoryId ? findCategoryById(post.categoryId) : null;
  const categoryName = category?.name || post.customCategory || 'その他';
  
  // タイトル最適化（60文字以内推奨）
  const siteName = 'AI活用創作フォーラム';
  const maxTitleLength = 60 - siteName.length - 3; // " - "分を引く
  const optimizedTitle = post.title.length > maxTitleLength 
    ? post.title.substring(0, maxTitleLength - 3) + '...'
    : post.title;
  const title = `${optimizedTitle} - ${siteName}`;
  
  // 説明文最適化（モバイル120文字、デスクトップ160文字）
  const maxDescLength = 150; // モバイル・デスクトップ両対応
  let description: string;
  
  if (post.description) {
    // 説明文がある場合は最適化
    if (post.description.length > maxDescLength) {
      description = post.description.substring(0, maxDescLength - 3) + '...';
    } else {
      description = post.description;
    }
  } else {
    // 説明文がない場合は他の情報から生成
    const hasExtraInfo = post.problemBackground || post.useCase || post.uniquePoints;
    if (hasExtraInfo) {
      const extraInfo = post.problemBackground || post.useCase || post.uniquePoints || '';
      description = extraInfo.length > maxDescLength 
        ? extraInfo.substring(0, maxDescLength - 3) + '...'
        : extraInfo;
    } else {
      description = `${categoryName}カテゴリのAI作品。${post.authorUsername}さんが投稿した創作アイデアをご覧ください。`;
    }
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://giminiaggregation.vercel.app';

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/posts/${id}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${siteUrl}/posts/${id}`,
      siteName,
      images: post.thumbnail ? [
        {
          url: post.thumbnail,
          width: 1200,
          height: 630,
          alt: post.title,
        }
      ] : [],
      locale: 'ja_JP',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.thumbnail ? [post.thumbnail] : [],
      site: '@AICreativeForum', // 実際のTwitterアカウントに変更
    },
    authors: [{ name: post.authorUsername }],
    keywords: [
      // メインキーワード
      'AI',
      'AI活用',
      '創作フォーラム',
      '創作アイデア',
      
      // カテゴリ関連
      categoryName,
      category?.description || '',
      
      // 作品関連
      'アイデア共有',
      'クリエイティブ',
      'イノベーション',
      
      // タグ（重複除去）
      ...(post.tagIds || []).filter(tag => tag.length > 0),
      
      // 作者関連
      post.authorUsername,
      
      // 特徴的なキーワード（内容から抽出）
      ...(post.problemBackground ? ['課題解決', '背景分析'] : []),
      ...(post.useCase ? ['活用事例', '利用シーン'] : []),
      ...(post.uniquePoints ? ['差別化', '独自性'] : []),
      ...(post.futureIdeas ? ['発展性', '応用'] : []),
    ].filter((keyword, index, array) => 
      keyword && keyword.trim() && array.indexOf(keyword) === index
    ),
  };
}

// メインコンポーネント（サーバーコンポーネント）
export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://giminiaggregation.vercel.app';

  return (
    <>
      {/* {post && <StructuredData post={post} siteUrl={siteUrl} />} */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
        <PostDetailClient postId={id} />
      </Suspense>
    </>
  );
}