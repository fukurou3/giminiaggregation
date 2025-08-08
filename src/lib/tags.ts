import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  increment, 
  query, 
  where, 
  limit,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import { Tag, TagReport, TagCategoryCount } from '@/types/Tag';

/**
 * タグIDを生成（日本語対応）
 */
export function generateTagId(tagName: string): string {
  return tagName
    .toLowerCase()
    .replace(/[・\s]+/g, '_')
    .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_-]/g, '')
    .trim();
}

/**
 * タグを作成または取得
 */
export async function createOrGetTag(tagName: string, isOfficial = false): Promise<Tag> {
  const tagId = generateTagId(tagName);
  const tagRef = doc(db, 'tags', tagId);
  
  const tagDoc = await getDoc(tagRef);
  
  if (tagDoc.exists()) {
    return { id: tagId, ...tagDoc.data() } as Tag;
  }
  
  // 新しいタグを作成
  const newTag: Omit<Tag, 'id'> = {
    name: tagName,
    aliases: [],
    count: 0,
    isOfficial,
    views: 0,
    favorites: 0,
    flagged: false,
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  };
  
  await setDoc(tagRef, newTag);
  
  return { id: tagId, ...newTag } as Tag;
}

/**
 * タグの統計情報を更新
 */
export async function updateTagStats(tagId: string, updates: {
  count?: number;
  views?: number;
  favorites?: number;
}): Promise<void> {
  const tagRef = doc(db, 'tags', tagId);
  
  const updateData: Record<string, any> = {
    updatedAt: serverTimestamp() as any,
  };
  
  if (updates.count !== undefined) {
    updateData.count = increment(updates.count);
  }
  if (updates.views !== undefined) {
    updateData.views = increment(updates.views);
  }
  if (updates.favorites !== undefined) {
    updateData.favorites = increment(updates.favorites);
  }
  
  await updateDoc(tagRef, updateData);
}

/**
 * 人気タグを取得
 */
export async function getPopularTags(limitCount = 20): Promise<Tag[]> {
  const tagsRef = collection(db, 'tags');
  
  // インデックスが必要なクエリを避けるため、全てのタグを取得してクライアント側でフィルタリング
  const snapshot = await getDocs(tagsRef);
  const allTags = snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  })) as Tag[];
  
  // フラグされていないタグのみフィルタリングし、カウント順でソート
  return allTags
    .filter(tag => !tag.flagged)
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, limitCount);
}

/**
 * タグを検索（名前・エイリアス）
 */
export async function searchTags(searchTerm: string, limitCount = 10): Promise<Tag[]> {
  const tagsRef = collection(db, 'tags');
  const q = query(
    tagsRef,
    where('flagged', '==', false),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  const allTags = snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  })) as Tag[];
  
  // クライアント側でフィルタリング（Firestoreの制限のため）
  const searchLower = searchTerm.toLowerCase();
  return allTags.filter(tag => 
    tag.name.toLowerCase().includes(searchLower) ||
    tag.aliases.some(alias => alias.toLowerCase().includes(searchLower))
  );
}

/**
 * タグ×カテゴリの投稿数を更新
 */
export async function updateTagCategoryCount(
  tagId: string, 
  categoryId: string, 
  increment_count: number
): Promise<void> {
  const countId = `${tagId}_${categoryId}`;
  const countRef = doc(db, 'tagCategoryCount', countId);
  
  const countDoc = await getDoc(countRef);
  
  if (countDoc.exists()) {
    await updateDoc(countRef, {
      count: increment(increment_count),
      updatedAt: serverTimestamp() as any,
    });
  } else {
    const newCount: Omit<TagCategoryCount, 'id'> = {
      tagId,
      categoryId,
      count: Math.max(0, increment_count),
      updatedAt: serverTimestamp() as any,
    };
    await setDoc(countRef, newCount);
  }
}

/**
 * タグのカテゴリ別統計を取得
 */
export async function getTagCategoryStats(tagId: string): Promise<TagCategoryCount[]> {
  const countsRef = collection(db, 'tagCategoryCount');
  const q = query(
    countsRef,
    where('tagId', '==', tagId)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  })) as TagCategoryCount[];
}

/**
 * タグを通報
 */
export async function reportTag(
  tagId: string, 
  reason: string, 
  userId: string
): Promise<void> {
  const reportId = `${userId}_${Date.now()}`;
  const reportRef = doc(db, `tags/${tagId}/reports`, reportId);
  
  const newReport: Omit<TagReport, 'id'> = {
    tagId,
    reason,
    userId,
    createdAt: serverTimestamp() as any,
  };
  
  await setDoc(reportRef, newReport);
  
  // 通報数をチェックし、閾値を超えたらフラグ設定
  await checkAndFlagTag(tagId);
}

/**
 * 通報数をチェックしてタグをフラグ設定
 */
async function checkAndFlagTag(tagId: string): Promise<void> {
  const REPORT_THRESHOLD = 5; // 通報閾値
  
  await runTransaction(db, async (transaction) => {
    const reportsRef = collection(db, `tags/${tagId}/reports`);
    const reportsSnapshot = await getDocs(reportsRef);
    
    if (reportsSnapshot.size >= REPORT_THRESHOLD) {
      const tagRef = doc(db, 'tags', tagId);
      transaction.update(tagRef, {
        flagged: true,
        updatedAt: serverTimestamp() as any,
      });
    }
  });
}