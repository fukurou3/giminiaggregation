import { Tag } from '@/types/Tag';
import { getPopularTags } from '@/lib/tags';
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';
import { toSlug } from './normalize';
import { CONFIG } from '@/lib/config';
import { logEvent, logError } from '@/lib/observability';

const TAGS_COLLECTION = 'tags';

/**
 * タグリポジトリ - Firestoreからのタグデータ取得・更新を集約
 */
export class TagRepository {
  /**
   * 配列をチャンクに分割（Firestore IN句の10件制限対応）
   */
  private static chunk<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
      array.slice(i * size, (i + 1) * size)
    );
  }

  /**
   * タグの一括upsert処理
   * 既存タグは使用回数を増加、新規タグは作成
   */
  static async upsertTags(labels: string[]): Promise<void> {
    if (!labels.length) return;

    const timer = Date.now();
    
    try {
      // ラベルとslugのペアを作成
      const wanted = labels.map(label => ({ 
        label: label.trim(), 
        slug: toSlug(label) 
      })).filter(item => item.slug && item.label);

      if (!wanted.length) return;

      // 既存タグをslug ID で効率的に検索（document ID として slug を使用）
      const existing = new Set<string>(); // 存在するslugのセット
      
      // 並列でドキュメント存在チェック
      const existsChecks = wanted.map(async ({ slug }) => {
        try {
          // slug を document ID として直接参照（最高効率）
          const docRef = doc(db, TAGS_COLLECTION, slug);
          const docSnap = await getDoc(docRef);
          return docSnap.exists() ? slug : null;
        } catch {
          // slug が無効な document ID の場合（特殊文字など）
          return null;
        }
      });
      
      const results = await Promise.all(existsChecks);
      results.forEach(slug => {
        if (slug) existing.add(slug);
      });

      // 並列でupdate/create処理（slug を document ID として使用）
      const operations = wanted.map(async ({ label, slug }) => {
        const docRef = doc(db, TAGS_COLLECTION, slug);
        
        if (existing.has(slug)) {
          // 既存タグの更新
          await updateDoc(docRef, {
            usageCount: increment(1),
            lastUsedAt: serverTimestamp(),
            label, // より良い表記があれば更新
          });
        } else {
          // 新規タグの作成（slug を document ID として使用）
          await setDoc(docRef, {
            label,
            slug,
            usageCount: 1,
            lastUsedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          });
        }
      });

      await Promise.all(operations);

      logEvent('tags_upsert_success', {
        total_tags: wanted.length,
        existing_tags: existing.size,
        new_tags: wanted.length - existing.size,
        duration_ms: Date.now() - timer,
      });

    } catch (error) {
      logError(error, {}, {
        operation: 'upsertTags',
        labels_count: labels.length,
        duration_ms: Date.now() - timer,
      });
      throw error;
    }
  }

  /**
   * AIで使用する既存タグのリストを効率的に取得
   * 人気タグ + 最近使用タグを重複なしで返す
   */
  static async fetchExistingTags(): Promise<string[]> {
    const timer = Date.now();
    
    try {
      const [topSnapshot, recentSnapshot] = await Promise.all([
        getDocs(query(
          collection(db, TAGS_COLLECTION), 
          orderBy('usageCount', 'desc'), 
          limit(CONFIG.EXISTING_TOP)
        )),
        getDocs(query(
          collection(db, TAGS_COLLECTION), 
          orderBy('lastUsedAt', 'desc'), 
          limit(CONFIG.EXISTING_RECENT)
        ))
      ]);

      const labelSet = new Set<string>();
      
      // 人気タグを追加
      topSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const label = data.label as string;
        if (label && label.trim()) {
          labelSet.add(label.trim());
        }
      });

      // 最近使用タグを追加
      recentSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const label = data.label as string;
        if (label && label.trim()) {
          labelSet.add(label.trim());
        }
      });

      const result = Array.from(labelSet);

      logEvent('fetch_existing_tags_success', {
        total_count: result.length,
        top_count: topSnapshot.docs.length,
        recent_count: recentSnapshot.docs.length,
        duration_ms: Date.now() - timer,
      });

      return result;

    } catch (error) {
      logError(error, {}, {
        operation: 'fetchExistingTags',
        duration_ms: Date.now() - timer,
      });
      
      // フォールバック：既存の関数を使用
      try {
        const popularTags = await getPopularTags(CONFIG.EXISTING_TOP);
        return popularTags.map(tag => tag.name);
      } catch (fallbackError) {
        logError(fallbackError, {}, { operation: 'fetchExistingTags_fallback' });
        return [];
      }
    }
  }

  /**
   * 後方互換性のための既存メソッド保持
   */
  static async getExistingTagsForAI(): Promise<string[]> {
    return this.fetchExistingTags();
  }

  /**
   * 人気タグを取得（AI生成時の既存タグとして使用）
   * @deprecated fetchExistingTags()を使用してください
   */
  static async getPopularTagsForAI(): Promise<string[]> {
    try {
      const popularTags = await getPopularTags(CONFIG.EXISTING_TOP);
      return popularTags.map(tag => tag.name);
    } catch (error) {
      logError(error, {}, { operation: 'getPopularTagsForAI' });
      return [];
    }
  }

  /**
   * 最近使用されたタグを取得
   */
  static async getRecentTags(limitCount = CONFIG.EXISTING_RECENT): Promise<Tag[]> {
    try {
      const snapshot = await getDocs(query(
        collection(db, TAGS_COLLECTION),
        orderBy('lastUsedAt', 'desc'),
        limit(limitCount)
      ));

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tag[];

    } catch (error) {
      logError(error, {}, { operation: 'getRecentTags', limit: limitCount });
      return [];
    }
  }
}