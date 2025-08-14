import { MetadataRoute } from 'next'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { CATEGORY_MASTERS } from '@/lib/constants/categories'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://giminiaggregation.vercel.app'
  
  // 基本的な静的ページ
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ranking`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/submit`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    }
  ]

  // カテゴリページ
  const categoryPages: MetadataRoute.Sitemap = CATEGORY_MASTERS.map(category => ({
    url: `${baseUrl}/categories?category=${category.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // 投稿ページの動的生成
  let postPages: MetadataRoute.Sitemap = []
  
  try {
    // 公開されている投稿を取得（最新1000件）
    const postsQuery = query(
      collection(db, 'posts'),
      where('isPublic', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(1000)
    )
    
    const postsSnapshot = await getDocs(postsQuery)
    
    postPages = postsSnapshot.docs.map(doc => {
      const data = doc.data()
      const updatedAt = data.updatedAt?.toDate() || new Date()
      
      return {
        url: `${baseUrl}/posts/${doc.id}`,
        lastModified: updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      }
    })
  } catch (error) {
    console.error('Error generating sitemap for posts:', error)
    // エラー時は空配列を使用
    postPages = []
  }

  // ユーザープロフィールページ（publicIdがあるもののみ）
  let userPages: MetadataRoute.Sitemap = []
  
  try {
    const usersQuery = query(
      collection(db, 'userProfiles'),
      where('publicId', '!=', null),
      limit(500)
    )
    
    const usersSnapshot = await getDocs(usersQuery)
    
    userPages = usersSnapshot.docs
      .filter(doc => doc.data().publicId) // publicIdがnullでないものを再フィルタ
      .map(doc => {
        const data = doc.data()
        const updatedAt = data.updatedAt?.toDate() || new Date()
        
        return {
          url: `${baseUrl}/users/${data.publicId}`,
          lastModified: updatedAt,
          changeFrequency: 'monthly' as const,
          priority: 0.3,
        }
      })
  } catch (error) {
    console.error('Error generating sitemap for users:', error)
    userPages = []
  }

  return [
    ...staticPages,
    ...categoryPages,
    ...postPages,
    ...userPages,
  ]
}