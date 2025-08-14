/**
 * 投稿データのタグフィールドを確認するスクリプト
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

async function checkTagFields() {
  try {
    console.log('投稿データのタグフィールドを確認中...');
    
    const postsSnapshot = await db.collection('posts').limit(10).get();
    console.log(`チェック対象: ${postsSnapshot.size}件の投稿`);
    
    for (const doc of postsSnapshot.docs) {
      const data = doc.data();
      
      console.log(`\n投稿ID: ${doc.id}`);
      console.log(`タイトル: ${data.title}`);
      console.log(`tags フィールド:`, data.tags);
      console.log(`tagIds フィールド:`, data.tagIds);
      console.log(`tags の型:`, typeof data.tags, Array.isArray(data.tags) ? '(配列)' : '');
      console.log(`tagIds の型:`, typeof data.tagIds, Array.isArray(data.tagIds) ? '(配列)' : '');
      
      // フィールドの存在確認
      console.log(`フィールド存在確認:`);
      console.log(`  - tags: ${data.hasOwnProperty('tags')}`);
      console.log(`  - tagIds: ${data.hasOwnProperty('tagIds')}`);
    }
    
  } catch (error) {
    console.error('エラー:', error);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  checkTagFields()
    .then(() => {
      console.log('\nチェック完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('チェックに失敗しました:', error);
      process.exit(1);
    });
}

module.exports = { checkTagFields };