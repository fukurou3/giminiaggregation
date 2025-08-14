/**
 * Firestoreの投稿データを確認するスクリプト
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

async function checkPostsData() {
  try {
    console.log('投稿データを確認中...');
    
    const postsSnapshot = await db.collection('posts').get();
    console.log(`総投稿数: ${postsSnapshot.size}`);
    
    console.log('\n投稿データの詳細:');
    postsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. ID: ${doc.id}`);
      console.log(`   タイトル: ${data.title}`);
      console.log(`   categoryId: ${data.categoryId || 'UNDEFINED'}`);
      console.log(`   category: ${data.category || 'UNDEFINED'}`);
      console.log(`   isPublic: ${data.isPublic}`);
      console.log(`   thumbnail: ${data.thumbnail ? '有り' : '無し'}`);
      console.log(`   タグ: ${data.tags || data.tagIds || '無し'}`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  checkPostsData()
    .then(() => {
      console.log('\n確認完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('確認失敗:', error);
      process.exit(1);
    });
}

module.exports = { checkPostsData };