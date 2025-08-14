'use client';

import { Post } from '@/types/Post';
import { findCategoryById } from '@/lib/constants/categories';

interface StructuredDataProps {
  post: Post;
  siteUrl: string;
}

export function StructuredData({ post, siteUrl }: StructuredDataProps) {
  const category = post.categoryId ? findCategoryById(post.categoryId) : null;
  const categoryName = category?.name || post.customCategory || 'その他';

  // Safe date conversion helper
  const safeToISOString = (date: any): string => {
    try {
      // すでにISO文字列の場合はそのまま返す
      if (typeof date === 'string' && date.includes('T')) {
        const testDate = new Date(date);
        if (!isNaN(testDate.getTime())) {
          return testDate.toISOString();
        }
      }
      
      // Dateオブジェクトの場合
      if (date instanceof Date) {
        return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
      }
      
      // Firestore Timestampの場合
      if (date && typeof date === 'object' && (date.seconds || date.seconds === 0)) {
        const timestamp = new Date(date.seconds * 1000);
        return isNaN(timestamp.getTime()) ? new Date().toISOString() : timestamp.toISOString();
      }
      
      // 数値の場合（Unix timestamp）
      if (typeof date === 'number') {
        const timestamp = new Date(date);
        return isNaN(timestamp.getTime()) ? new Date().toISOString() : timestamp.toISOString();
      }
      
      // その他の場合は現在日時を返す
      return new Date().toISOString();
    } catch (error) {
      console.warn('Date conversion error:', error, 'input:', date);
      return new Date().toISOString();
    }
  };

  // Article Schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description,
    "image": post.thumbnail ? [post.thumbnail] : [],
    "url": `${siteUrl}/posts/${post.id}`,
    "datePublished": safeToISOString(post.createdAt),
    "dateModified": safeToISOString(post.updatedAt),
    "author": {
      "@type": "Person",
      "name": post.authorUsername,
      "url": `${siteUrl}/users/${post.authorPublicId}`
    },
    "publisher": {
      "@type": "Organization",
      "name": "AI活用創作フォーラム",
      "url": siteUrl,
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/logo.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${siteUrl}/posts/${post.id}`
    },
    "articleSection": categoryName,
    "keywords": [
      categoryName,
      'AI',
      'Canvas',
      'アイデア',
      'クリエイティブ',
      ...(post.tagIds || [])
    ].join(', '),
    "interactionStatistic": [
      {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/LikeAction",
        "userInteractionCount": post.favoriteCount || 0
      },
      {
        "@type": "InteractionCounter", 
        "interactionType": "https://schema.org/ViewAction",
        "userInteractionCount": post.views || 0
      }
    ]
  };

  // BreadcrumbList Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "ホーム",
        "item": siteUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "作品一覧",
        "item": `${siteUrl}/posts`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": categoryName,
        "item": `${siteUrl}/categories?category=${post.categoryId || 'other'}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": post.title,
        "item": `${siteUrl}/posts/${post.id}`
      }
    ]
  };

  // WebSite Schema（ルートページでのみ使用を想定しているが、検索機能があるため含める）
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "AI活用創作フォーラム",
    "url": siteUrl,
    "description": "AIで作られた素晴らしいアイデアを発見・共有できるプラットフォーム",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${siteUrl}/search/{search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  // CreativeWork Schema（AI作品特有の情報）
  const creativeWorkSchema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": post.title,
    "description": post.description,
    "image": post.thumbnail,
    "url": `${siteUrl}/posts/${post.id}`,
    "creator": {
      "@type": "Person",
      "name": post.authorUsername
    },
    "dateCreated": safeToISOString(post.createdAt),
    "genre": categoryName,
    "about": [
      {
        "@type": "Thing",
        "name": "AI"
      },
      {
        "@type": "Thing", 
        "name": "創作"
      },
      {
        "@type": "Thing",
        "name": categoryName
      }
    ],
    "aggregateRating": post.favoriteCount > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": Math.min(5, Math.max(1, (post.favoriteCount / Math.max(post.views || 1, 1)) * 5)),
      "ratingCount": post.favoriteCount,
      "bestRating": 5,
      "worstRating": 1
    } : undefined
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema, null, 2)
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema, null, 2)
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema, null, 2)
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(creativeWorkSchema, null, 2)
        }}
      />
    </>
  );
}