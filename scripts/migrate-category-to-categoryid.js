/**
 * FirestoreのPostコレクションでcategoryフィールドをcategoryIdに移行するマイグレーションスクリプト
 */
const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin SDKの初期化
if (!admin.apps.length) {
  // 環境変数からFirebase設定を取得
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
    // ローカル開発環境での認証（Application Default Credentials）
    admin.initializeApp({
      projectId: 'giminiaggregation'
    });
  }
}

const db = admin.firestore();

// カテゴリマスター定義（フロントエンドと同じ）
const CATEGORY_MASTERS = [
  { id: "business", name: "ビジネス・業務支援", description: "業務効率化、生産性向上、プロジェクト管理など", icon: "💼", sortOrder: 1 },
  { id: "education", name: "学習・教育", description: "勉強支援ツール、教育用コンテンツ、スキルアップ", icon: "🎓", sortOrder: 2 },
  { id: "development", name: "開発・テクニカル", description: "プログラミング、開発支援、技術文書など", icon: "💻", sortOrder: 3 },
  { id: "creative", name: "クリエイティブ・デザイン", description: "デザイン、画像生成、クリエイティブ制作", icon: "🎨", sortOrder: 4 },
  { id: "knowledge", name: "情報管理・ナレッジ", description: "データ整理、知識管理、情報収集", icon: "📊", sortOrder: 5 },
  { id: "lifestyle", name: "ライフスタイル", description: "日常生活、趣味、健康管理など", icon: "🏠", sortOrder: 6 },
  { id: "social", name: "ソーシャル・コミュニケーション", description: "SNS活用、コミュニケーション支援", icon: "💬", sortOrder: 7 },
  { id: "chatbot", name: "チャットボット", description: "対話AI、自動応答、カスタマーサポート", icon: "🤖", sortOrder: 8 },
  { id: "game", name: "ゲーム・エンターテインメント", description: "ゲーム、娯楽、エンターテインメント", icon: "🎮", sortOrder: 9 },
  { id: "other", name: "その他／未分類", description: "分類不能なもの、ニッチ系", icon: "📦", sortOrder: 10 }
];

// 既存カテゴリ名からcategoryIdへのマッピング
function mapCategoryToId(categoryName, tags = []) {
  if (!categoryName) {
    // カテゴリが設定されていない場合はタグから推測
    return inferCategoryFromTags(tags);
  }

  const categoryLower = categoryName.toLowerCase().trim();
  
  // 直接マッチング
  const directMatch = CATEGORY_MASTERS.find(cat => 
    cat.name.toLowerCase() === categoryLower || 
    cat.id === categoryLower
  );
  if (directMatch) return directMatch.id;

  // 部分マッチング
  if (categoryLower.includes('web') || categoryLower.includes('サイト') || categoryLower.includes('アプリケーション')) {
    return 'web-app';
  }
  if (categoryLower.includes('mobile') || categoryLower.includes('android') || categoryLower.includes('ios') || categoryLower.includes('モバイル')) {
    return 'mobile-app';
  }
  if (categoryLower.includes('desktop') || categoryLower.includes('electron') || categoryLower.includes('デスクトップ')) {
    return 'desktop-app';
  }
  if (categoryLower.includes('api') || categoryLower.includes('backend') || categoryLower.includes('server') || categoryLower.includes('サービス')) {
    return 'api-service';
  }
  if (categoryLower.includes('tool') || categoryLower.includes('cli') || categoryLower.includes('script') || categoryLower.includes('ツール')) {
    return 'tool-utility';
  }
  if (categoryLower.includes('library') || categoryLower.includes('package') || categoryLower.includes('npm') || categoryLower.includes('ライブラリ')) {
    return 'library-package';
  }
  if (categoryLower.includes('game') || categoryLower.includes('ゲーム')) {
    return 'game';
  }
  // 日本語カテゴリのマッピング
  if (categoryLower.includes('ビジネス') || categoryLower.includes('業務支援') || categoryLower.includes('業務')) {
    return 'business'; // ビジネス・業務支援カテゴリ
  }

  // タグからも推測を試行
  const tagBasedCategory = inferCategoryFromTags(tags);
  if (tagBasedCategory !== 'other') {
    return tagBasedCategory;
  }

  // デフォルト
  return 'other';
}

// タグからカテゴリを推測
function inferCategoryFromTags(tags = []) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return 'other';
  }

  const tagsStr = tags.join(' ').toLowerCase();
  
  if (tagsStr.includes('react native') || tagsStr.includes('flutter') || tagsStr.includes('android') || tagsStr.includes('ios')) {
    return 'mobile-app';
  }
  if (tagsStr.includes('electron') || tagsStr.includes('desktop')) {
    return 'desktop-app';
  }
  if (tagsStr.includes('api') || tagsStr.includes('express') || tagsStr.includes('fastapi') || tagsStr.includes('django') || tagsStr.includes('backend')) {
    return 'api-service';
  }
  if (tagsStr.includes('cli') || tagsStr.includes('script') || tagsStr.includes('automation') || tagsStr.includes('tool')) {
    return 'tool-utility';
  }
  if (tagsStr.includes('npm') || tagsStr.includes('pypi') || tagsStr.includes('library') || tagsStr.includes('package')) {
    return 'library-package';
  }
  if (tagsStr.includes('game') || tagsStr.includes('unity') || tagsStr.includes('godot')) {
    return 'game';
  }
  if (tagsStr.includes('react') || tagsStr.includes('vue') || tagsStr.includes('angular') || tagsStr.includes('next') || tagsStr.includes('web')) {
    return 'web-app';
  }

  return 'other';
}

async function analyzeCurrentData() {
  console.log('現在のデータを分析中...');
  
  const postsSnapshot = await db.collection('posts').get();
  console.log(`総投稿数: ${postsSnapshot.size}`);
  
  const categoryStats = {};
  const categoryMappings = [];
  
  for (const doc of postsSnapshot.docs) {
    const data = doc.data();
    const category = data.category;
    const tags = data.tags || data.tagIds || [];
    const categoryId = mapCategoryToId(category, tags);
    
    // 統計
    if (!categoryStats[category || 'undefined']) {
      categoryStats[category || 'undefined'] = 0;
    }
    categoryStats[category || 'undefined']++;
    
    categoryMappings.push({
      id: doc.id,
      title: data.title,
      currentCategory: category,
      tags: tags,
      mappedCategoryId: categoryId
    });
  }
  
  console.log('\n既存カテゴリの分布:');
  Object.entries(categoryStats).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}件`);
  });
  
  console.log('\nマッピング例 (最初の10件):');
  categoryMappings.slice(0, 10).forEach(mapping => {
    console.log(`  "${mapping.currentCategory}" → "${mapping.mappedCategoryId}" (${mapping.title})`);
  });
  
  return categoryMappings;
}

async function migrateToCategoryId(dryRun = false) {
  try {
    console.log(`\n${dryRun ? 'DRY RUN: ' : ''}マイグレーション開始: category → categoryId`);
    
    // 現在のデータを分析
    const mappings = await analyzeCurrentData();
    
    if (dryRun) {
      console.log('\nDRY RUN完了。実際の変更は行われていません。');
      return;
    }
    
    console.log('\n実際のマイグレーションを開始...');
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // バッチ処理
    const batchSize = 500;
    let batch = db.batch();
    let operationsInBatch = 0;
    
    for (const mapping of mappings) {
      try {
        const docRef = db.collection('posts').doc(mapping.id);
        
        // categoryIdを追加し、古いcategoryフィールドを削除
        batch.update(docRef, {
          categoryId: mapping.mappedCategoryId,
          category: admin.firestore.FieldValue.delete() // 古いフィールドを削除
        });
        
        operationsInBatch++;
        updatedCount++;
        
        // バッチサイズに達したらコミット
        if (operationsInBatch >= batchSize) {
          await batch.commit();
          console.log(`バッチ ${Math.ceil(updatedCount / batchSize)} をコミット済み (${updatedCount}/${mappings.length})`);
          batch = db.batch();
          operationsInBatch = 0;
        }
        
      } catch (error) {
        console.error(`エラー (${mapping.id}):`, error);
        errorCount++;
      }
    }
    
    // 残りのバッチをコミット
    if (operationsInBatch > 0) {
      await batch.commit();
      console.log('最終バッチをコミット済み');
    }
    
    console.log('\nマイグレーション完了:');
    console.log(`- 成功: ${updatedCount}件`);
    console.log(`- エラー: ${errorCount}件`);
    console.log(`- 総数: ${mappings.length}件`);
    
  } catch (error) {
    console.error('マイグレーションエラー:', error);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  
  migrateToCategoryId(isDryRun)
    .then(() => {
      console.log('処理が正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('処理に失敗しました:', error);
      process.exit(1);
    });
}

module.exports = { migrateToCategoryId, analyzeCurrentData };