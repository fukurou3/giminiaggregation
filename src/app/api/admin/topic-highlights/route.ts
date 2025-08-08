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
function docToPost(doc: DocumentData): Post {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title || '',
    description: data.description || '',
    url: data.url || '',
    thumbnailUrl: data.thumbnailUrl || data.ogpImage || '',
    tagIds: data.tagIds || [],
    categoryId: data.categoryId || '',
    authorId: data.authorId || '',
    authorUsername: data.authorUsername || '',
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    views: data.views || 0,
    likes: data.likes || 0,
    favoriteCount: data.favoriteCount || 0,
    isPublic: data.isPublic !== false,
    featured: data.featured || false
  };
}

export async function GET() {
  try {
    console.log('API: Getting admin topic highlights...');
    
    // 管理者が設定したハイライト設定を取得
    const configRef = collection(db, 'adminTopicHighlights');
    
    // まずすべてのドキュメントを取得してログ出力
    const allDocsSnapshot = await getDocs(configRef);
    console.log('API: Total documents in adminTopicHighlights:', allDocsSnapshot.size);
    
    allDocsSnapshot.docs.forEach(doc => {
      console.log('API: Document data:', doc.id, doc.data());
    });
    
    // アクティブなもののみフィルタリング（クライアントサイドで）
    const activeConfigs = allDocsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.isActive === true;
    }).sort((a, b) => {
      return (a.data().order || 0) - (b.data().order || 0);
    });

    console.log('API: Active configs found:', activeConfigs.length);

    if (activeConfigs.length === 0) {
      console.log('API: No active configs, returning auto highlights');
      return NextResponse.json({ highlights: [], useAutoHighlights: true });
    }

    // 設定に基づいてハイライトを構築
    const highlights: TopicHighlight[] = await Promise.all(
      activeConfigs.map(async (configDoc) => {
        const config = {
          id: configDoc.id,
          ...configDoc.data()
        } as AdminTopicHighlightConfig;
        
        console.log('API: Processing config:', config.id, config.title);

        // 指定された投稿IDから投稿を取得
        const posts: Post[] = [];
        for (const postId of config.postIds) {
          try {
            const postRef = doc(db, 'posts', postId);
            const postDoc = await getDoc(postRef);
            if (postDoc.exists() && postDoc.data().isPublic !== false) {
              posts.push(docToPost(postDoc));
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