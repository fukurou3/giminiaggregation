import {
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  doc,
  getDoc,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post } from '@/types/Post';
import { ColumnSummary } from '@/types/Column';
import { TopicHighlight, Topic } from '@/types/Topic';

// ドキュメントからPostオブジェクトに変換するヘルパー関数
const docToPost = (doc: QueryDocumentSnapshot<DocumentData>): Post => ({
  id: doc.id,
  favoriteCount: doc.data().favoriteCount || 0,
  ...doc.data(),
} as Post);


// ドキュメントからColumnSummaryオブジェクトに変換するヘルパー関数
const docToColumnSummary = (doc: QueryDocumentSnapshot<DocumentData>): ColumnSummary => ({
  id: doc.id,
  ...doc.data(),
} as ColumnSummary);

// ドキュメントからTopicオブジェクトに変換するヘルパー関数
const docToTopic = (doc: QueryDocumentSnapshot<DocumentData>): Topic => ({
  id: doc.id,
  ...doc.data(),
} as Topic);

/**
 * トレンド作品を取得
 * @param limitCount 取得する件数
 * @returns トレンド作品の配列
 */
export async function getTrendingPosts(limitCount: number = 6): Promise<Post[]> {
  try {
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      where('isPublic', '==', true),
      orderBy('views', 'desc'),
      orderBy('favoriteCount', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToPost);
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    return [];
  }
}


/**
 * 注目コラムを取得
 * @param limitCount 取得する件数
 * @returns コラムの配列
 */
export async function getFeaturedColumns(limitCount: number = 5): Promise<ColumnSummary[]> {
  try {
    const columnsRef = collection(db, 'columns');
    const q = query(
      columnsRef,
      where('isPublic', '==', true),
      where('featured', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToColumnSummary);
  } catch (error) {
    console.error('Error fetching featured columns:', error);
    return [];
  }
}

/**
 * 人気トピックのハイライトを取得
 * @returns トピックハイライトの配列
 */
export async function getTopicHighlights(): Promise<TopicHighlight[]> {
  try {
    // まず管理者設定を確認
    try {
      console.log('Checking for admin highlights...');
      
      // クライアントサイドでのみAPIを呼び出す
      if (typeof window !== 'undefined') {
        const response = await fetch('/api/admin/topic-highlights');
        if (response.ok) {
          const adminData = await response.json();
          console.log('Admin highlights response:', adminData);
          if (!adminData.useAutoHighlights && adminData.highlights.length > 0) {
            console.log('Using admin highlights:', adminData.highlights);
            return adminData.highlights;
          }
        } else {
          console.log('Admin highlights API failed:', response.status);
        }
      } else {
        // サーバーサイドでは直接Firestoreから取得
        const configRef = collection(db, 'adminTopicHighlights');
        const configQuery = query(
          configRef, 
          where('isActive', '==', true),
          orderBy('order')
        );
        const configSnapshot = await getDocs(configQuery);
        
        if (!configSnapshot.empty) {
          console.log('Found admin highlights on server side:', configSnapshot.docs.length);
          
          // 設定に基づいてハイライトを構築
          const highlights: TopicHighlight[] = await Promise.all(
            configSnapshot.docs.map(async (configDoc) => {
              const config = {
                id: configDoc.id,
                ...configDoc.data()
              };

              // 指定された投稿IDから投稿を取得
              const posts: Post[] = [];
              for (const postId of (config as any).postIds || []) {
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
                  name: (config as any).title,
                  type: 'genre',
                  popularityScore: (config as any).order,
                  posts: posts,
                  totalPosts: posts.length,
                  averageLikes: posts.reduce((sum, p) => sum + (p.favoriteCount || 0), 0) / Math.max(posts.length, 1)
                },
                featuredPosts: posts
              };
            })
          );
          
          const validHighlights = highlights.filter(h => h.featuredPosts.length > 0);
          if (validHighlights.length > 0) {
            console.log('Returning admin highlights from server:', validHighlights);
            return validHighlights;
          }
        }
      }
    } catch (error) {
      console.error('Admin highlights error:', error);
    }

    console.log('Falling back to auto highlights');
    // 従来の自動ハイライト機能
    const topicsRef = collection(db, 'topics');
    const topicsQuery = query(topicsRef, orderBy('popularityScore', 'desc'), limit(5));
    const topicSnapshot = await getDocs(topicsQuery);

    // 取得したトピックごとに関連する投稿を取得
    const highlights: TopicHighlight[] = await Promise.all(
      topicSnapshot.docs.map(async (topicDoc) => {
        const topic = docToTopic(topicDoc);

        // 各トピックに関連する投稿を最新3件取得
        const postsRef = collection(db, 'posts');
        const postsQuery = query(
          postsRef,
          where('isPublic', '==', true),
          topic.type === 'genre'
            ? where('category', '==', topic.id)
            : where('tags', 'array-contains', topic.id),
          orderBy('views', 'desc'),
          orderBy('favoriteCount', 'desc'),
          limit(3)
        );
        const postsSnapshot = await getDocs(postsQuery);
        const featuredPosts = postsSnapshot.docs.map(docToPost);

        return { topic, featuredPosts };
      })
    );

    return highlights;
  } catch (error) {
    console.error('Error fetching topic highlights:', error);
    return [];
  }
}

/**
 * ホーム画面用のデータを一括取得
 * @returns ホーム画面用の全データ
 */
export async function getHomeData() {
  try {
    const [trendingPosts, featuredColumns, topicHighlights] = await Promise.all([
      getTrendingPosts(6),
      getFeaturedColumns(5),
      getTopicHighlights(),
    ]);

    return {
      trendingPosts,
      featuredColumns,
      topicHighlights,
    };
  } catch (error) {
    console.error('Error fetching home data:', error);
    return {
      trendingPosts: [],
      featuredColumns: [],
      topicHighlights: [],
    };
  }
}