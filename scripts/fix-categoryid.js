/**
 * 既存の投稿データのcategoryIdをbusinessに修正するスクリプト
 */
const admin = require('firebase-admin');

// Firebase Admin SDKの初期化
if (!admin.apps.length) {
  if (process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId: 'giminiaggregation'
    });
  } else {
    admin.initializeApp({
      projectId: 'giminiaggregation'
    });
  }
}

const db = admin.firestore();

async function fixCategoryIds() {
  try {
    console.log('categoryIdをbusinessに修正中...');
    
    const postsSnapshot = await db.collection('posts').get();
    console.log(`総投稿数: ${postsSnapshot.size}`);
    
    let updatedCount = 0;
    const batchSize = 500;
    let batch = db.batch();
    let operationsInBatch = 0;
    
    for (const doc of postsSnapshot.docs) {
      const data = doc.data();
      
      // categoryIdをbusinessに設定
      batch.update(doc.ref, { categoryId: 'business' });
      operationsInBatch++;
      updatedCount++;
      
      console.log(`更新予定: ${doc.id} -> categoryId: business (${data.title})`);
      
      // バッチサイズに達したらコミット
      if (operationsInBatch >= batchSize) {
        await batch.commit();
        console.log(`バッチ ${Math.ceil(updatedCount / batchSize)} をコミット済み`);
        batch = db.batch();
        operationsInBatch = 0;
      }
    }
    
    // 残りのバッチをコミット
    if (operationsInBatch > 0) {
      await batch.commit();
      console.log('最終バッチをコミット済み');
    }
    
    console.log(`\n修正完了: ${updatedCount}件の投稿をbusinessカテゴリに設定しました`);
    
  } catch (error) {
    console.error('エラー:', error);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  fixCategoryIds()
    .then(() => {
      console.log('修正が正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('修正に失敗しました:', error);
      process.exit(1);
    });
}

module.exports = { fixCategoryIds };