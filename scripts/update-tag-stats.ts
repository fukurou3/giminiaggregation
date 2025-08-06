/**
 * タグ統計を一括更新するバッチスクリプト
 * Usage: npx ts-node scripts/update-tag-stats.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';

// Firebase Admin初期化
const serviceAccount = require(path.join(process.cwd(), 'google-service-account.json'));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function updateTagStats() {
  console.log('🚀 Starting tag statistics update...');
  
  try {
    // 全ての投稿を取得
    const postsRef = db.collection('posts');
    const postsSnapshot = await postsRef.where('isPublic', '==', true).get();
    
    console.log(`📊 Found ${postsSnapshot.size} public posts`);
    
    // タグ統計を集計
    const tagStats = new Map<string, { count: number; views: number; favorites: number }>();
    const tagCategoryStats = new Map<string, { count: number }>();
    
    postsSnapshot.forEach(doc => {
      const post = doc.data();
      const views = post.views || 0;
      const favorites = post.favoriteCount || 0;
      
      // 新形式のtagIds処理
      if (post.tagIds && Array.isArray(post.tagIds)) {
        post.tagIds.forEach((tagId: string) => {
          const current = tagStats.get(tagId) || { count: 0, views: 0, favorites: 0 };
          tagStats.set(tagId, {
            count: current.count + 1,
            views: current.views + views,
            favorites: current.favorites + favorites
          });
          
          // カテゴリ別統計
          const categoryId = post.categoryId || 'other';
          const categoryKey = `${tagId}_${categoryId}`;
          const currentCategory = tagCategoryStats.get(categoryKey) || { count: 0 };
          tagCategoryStats.set(categoryKey, {
            count: currentCategory.count + 1
          });
        });
      }
      
      // 旧形式のtags処理（後方互換性）
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach((tagName: string) => {
          const tagId = tagName.toLowerCase().replace(/[・\s]+/g, '_');
          const current = tagStats.get(tagId) || { count: 0, views: 0, favorites: 0 };
          tagStats.set(tagId, {
            count: current.count + 1,
            views: current.views + views,
            favorites: current.favorites + favorites
          });
        });
      }
    });
    
    console.log(`📈 Updating ${tagStats.size} tags...`);
    
    // バッチで統計を更新
    const batch = db.batch();
    let batchCount = 0;
    
    for (const [tagId, stats] of tagStats) {
      const tagRef = db.collection('tags').doc(tagId);
      batch.update(tagRef, {
        count: stats.count,
        views: stats.views,
        favorites: stats.favorites,
        updatedAt: new Date()
      });
      
      batchCount++;
      
      // Firestoreの制限（500操作/バッチ）に対応
      if (batchCount >= 450) {
        await batch.commit();
        console.log(`✅ Batch committed (${batchCount} operations)`);
        batchCount = 0;
      }
    }
    
    // 残りのバッチをコミット
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Final batch committed (${batchCount} operations)`);
    }
    
    console.log(`📊 Updating ${tagCategoryStats.size} tag-category relationships...`);
    
    // タグ×カテゴリ統計を更新
    const categoryBatch = db.batch();
    let categoryBatchCount = 0;
    
    for (const [key, stats] of tagCategoryStats) {
      const [tagId, categoryId] = key.split('_');
      const countRef = db.collection('tagCategoryCount').doc(key);
      categoryBatch.set(countRef, {
        tagId,
        categoryId,
        count: stats.count,
        updatedAt: new Date()
      }, { merge: true });
      
      categoryBatchCount++;
      
      if (categoryBatchCount >= 450) {
        await categoryBatch.commit();
        console.log(`✅ Category batch committed (${categoryBatchCount} operations)`);
        categoryBatchCount = 0;
      }
    }
    
    if (categoryBatchCount > 0) {
      await categoryBatch.commit();
      console.log(`✅ Final category batch committed (${categoryBatchCount} operations)`);
    }
    
    console.log('🎉 Tag statistics update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating tag statistics:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  updateTagStats()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default updateTagStats;