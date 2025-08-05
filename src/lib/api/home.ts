import {
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs,
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
    // トピックを人気順に取得
    const topicsRef = collection(db, 'topics');
    const topicsQuery = query(topicsRef, orderBy('popularityScore', 'desc'), limit(5));
    const topicSnapshot = await getDocs(topicsQuery);

    // 取得したトピックごとに関連する投稿を取得
    const highlights: TopicHighlight[] = await Promise.all(
      topicSnapshot.docs.map(async (topicDoc) => {
        const topic = docToTopic(topicDoc);

        // 各トピックに関連する投稿を最大3件取得
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