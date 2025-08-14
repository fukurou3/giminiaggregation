const admin = require('firebase-admin');

// Firebase Admin SDKを初期化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('../google-service-account.json')),
    projectId: 'gimin-aggregation'
  });
}

const db = admin.firestore();

async function createTopicHighlights() {
  try {
    console.log('Creating topic highlights...');

    // まず既存の投稿を取得
    const postsSnapshot = await db.collection('posts')
      .where('isPublic', '==', true)
      .orderBy('favoriteCount', 'desc')
      .limit(20)
      .get();

    const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Found ${posts.length} posts`);

    if (posts.length < 6) {
      console.log('Not enough posts to create highlights');
      return;
    }

    // サンプルのトピックハイライトを作成
    const highlights = [
      {
        title: '今週の注目作品',
        postIds: posts.slice(0, 3).map(p => p.id),
        order: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'おすすめゲーム',
        postIds: posts.slice(3, 6).map(p => p.id),
        order: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Firestoreに保存
    const batch = db.batch();
    highlights.forEach((highlight, index) => {
      const docRef = db.collection('adminTopicHighlights').doc(`highlight_${index + 1}`);
      batch.set(docRef, highlight);
    });

    await batch.commit();
    console.log('Topic highlights created successfully');

  } catch (error) {
    console.error('Error creating topic highlights:', error);
  }
}

createTopicHighlights();