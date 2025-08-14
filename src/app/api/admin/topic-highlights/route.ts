import { NextResponse } from 'next/server';
import { collection, getDocs, doc, getDoc, query, orderBy, where, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TopicHighlight } from '@/types/Topic';
import { Post } from '@/types/Post';

interface AdminTopicHighlightConfig {
  id: string;
  title: string;
  postIds: string[];
  order: number;
  isActive: boolean;
  updatedAt: Date;
}

// Postドキュメントを変換する関数
async function docToPost(doc: DocumentData): Promise<Post> {
  const data = doc.data();
  
  // シャードからお気に入り数を取得
  const { getFavoriteCount } = await import('@/lib/favorites');
  const actualFavoriteCount = await getFavoriteCount(doc.id);
  
  return {
    id: doc.id,
    title: data.title || '',
    description: data.description || '',
    url: data.url || '',
    thumbnail: data.thumbnail || data.ogpImage || '',
    prImages: data.prImages || [],
    ogpTitle: data.ogpTitle,
    ogpDescription: data.ogpDescription,
    ogpImage: data.ogpImage,
    tagIds: data.tagIds || [],
    categoryId: data.categoryId || '',
    customCategory: data.customCategory,
    authorId: data.authorId || '',
    authorUsername: data.authorUsername || '',
    authorPublicId: data.authorPublicId || '',
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    views: data.views || 0,
    likes: data.likes || 0,
    favoriteCount: actualFavoriteCount, // 実際のお気に入り数を使用
    isPublic: data.isPublic !== false,
    featured: data.featured || false,
    problemBackground: data.problemBackground,
    useCase: data.useCase,
    uniquePoints: data.uniquePoints,
    futureIdeas: data.futureIdeas,
    acceptInterview: data.acceptInterview || false
  };
}

export async function GET() {
  try {
    // 管理者が設定したハイライト設定を取得
    const configRef = collection(db, 'adminTopicHighlights');
    const allDocsSnapshot = await getDocs(configRef);
    
    // アクティブなもののみフィルタリング
    const activeConfigs = allDocsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.isActive === true;
    }).sort((a, b) => {
      return (a.data().order || 0) - (b.data().order || 0);
    });

    if (activeConfigs.length === 0) {
      return NextResponse.json({ highlights: [], useAutoHighlights: true });
    }

    // 設定に基づいてハイライトを構築
    const highlights: TopicHighlight[] = await Promise.all(
      activeConfigs.map(async (configDoc) => {
        const config = {
          id: configDoc.id,
          ...configDoc.data()
        } as AdminTopicHighlightConfig;

        // 指定された投稿IDから投稿を取得
        const posts: Post[] = [];
        for (const postId of config.postIds) {
          try {
            const postRef = doc(db, 'posts', postId);
            const postDoc = await getDoc(postRef);
            if (postDoc.exists()) {
              const postData = postDoc.data();
              if (postData.isPublic !== false) {
                const post = await docToPost(postDoc);
                posts.push(post);
              }
            }
          } catch (error) {
            console.error(`Error fetching post ${postId}:`, error);
          }
        }

        // TopicHighlight形式に変換
        return {
          topic: {
            id: config.id,
            name: config.title,
            type: 'manual' as 'genre', // カスタムタイプ
            popularityScore: config.order,
            posts: posts,
            totalPosts: posts.length
          },
          featuredPosts: posts
        };
      })
    );

    return NextResponse.json({ 
      highlights: highlights.filter(h => h.featuredPosts.length > 0),
      useAutoHighlights: false 
    });

  } catch (error) {
    console.error('Error fetching admin topic highlights:', error);
    return NextResponse.json({ 
      highlights: [], 
      useAutoHighlights: true 
    }, { status: 500 });
  }
}