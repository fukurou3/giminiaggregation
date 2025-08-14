/**
 * FirestoreのPostコレクションでtagsフィールドをtagIdsに移行するマイグレーションスクリプト
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

async function analyzeCurrentData() {
  console.log('現在のデータを分析中...');
  
  const postsSnapshot = await db.collection('posts').get();
  console.log(`総投稿数: ${postsSnapshot.size}`);
  
  let tagsFieldCount = 0;
  let tagIdsFieldCount = 0;
  let bothFieldsCount = 0;
  let noTagsCount = 0;
  
  const sampleMappings = [];
  
  for (const doc of postsSnapshot.docs) {
    const data = doc.data();
    const hasTags = data.hasOwnProperty('tags') && Array.isArray(data.tags);
    const hasTagIds = data.hasOwnProperty('tagIds') && Array.isArray(data.tagIds);
    
    if (hasTags && hasTagIds) {
      bothFieldsCount++;
    } else if (hasTags) {
      tagsFieldCount++;
    } else if (hasTagIds) {
      tagIdsFieldCount++;
    } else {
      noTagsCount++;
    }
    
    // サンプルデータを保存（最初の5件）
    if (sampleMappings.length < 5) {
      sampleMappings.push({
        id: doc.id,
        title: data.title,
        tags: data.tags,
        tagIds: data.tagIds,
        hasTagsField: hasTags,
        hasTagIdsField: hasTagIds
      });
    }
  }
  
  console.log('\n=== データ分析結果 ===');
  console.log(`tagsフィールドのみ: ${tagsFieldCount}件`);
  console.log(`tagIdsフィールドのみ: ${tagIdsFieldCount}件`);
  console.log(`両方のフィールド: ${bothFieldsCount}件`);
  console.log(`タグなし: ${noTagsCount}件`);
  
  console.log('\n=== サンプルデータ ===');
  sampleMappings.forEach(mapping => {
    console.log(`ID: ${mapping.id}`);
    console.log(`  タイトル: ${mapping.title}`);
    console.log(`  tags: ${JSON.stringify(mapping.tags)} (存在: ${mapping.hasTagsField})`);
    console.log(`  tagIds: ${JSON.stringify(mapping.tagIds)} (存在: ${mapping.hasTagIdsField})`);
    console.log('');
  });
  
  return {
    total: postsSnapshot.size,
    tagsFieldCount,
    tagIdsFieldCount,
    bothFieldsCount,
    noTagsCount,
    needsMigration: tagsFieldCount > 0
  };
}

async function migrateTagsToTagIds(dryRun = false) {
  try {
    console.log(`\n${dryRun ? 'DRY RUN: ' : ''}マイグレーション開始: tags → tagIds`);
    
    // 現在のデータを分析
    const analysis = await analyzeCurrentData();
    
    if (!analysis.needsMigration) {
      console.log('\nマイグレーションは不要です。');
      return;
    }
    
    if (dryRun) {
      console.log('\nDRY RUN完了。実際の変更は行われていません。');
      return;
    }
    
    console.log('\n実際のマイグレーションを開始...');
    
    const postsSnapshot = await db.collection('posts').get();
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // バッチ処理
    const batchSize = 500;
    let batch = db.batch();
    let operationsInBatch = 0;
    
    for (const doc of postsSnapshot.docs) {
      try {
        const data = doc.data();
        const hasTags = data.hasOwnProperty('tags') && Array.isArray(data.tags);
        const hasTagIds = data.hasOwnProperty('tagIds') && Array.isArray(data.tagIds);
        
        // tagsフィールドがあり、tagIdsフィールドがない場合のみ移行
        if (hasTags && !hasTagIds) {
          console.log(`移行中: ${doc.id} - tags: ${JSON.stringify(data.tags)}`);
          
          const docRef = db.collection('posts').doc(doc.id);
          
          // tagsをtagIdsにコピーし、古いtagsフィールドを削除
          batch.update(docRef, {
            tagIds: data.tags,
            tags: admin.firestore.FieldValue.delete()
          });
          
          operationsInBatch++;
          updatedCount++;
          
          // バッチサイズに達したらコミット
          if (operationsInBatch >= batchSize) {
            await batch.commit();
            console.log(`バッチ ${Math.ceil(updatedCount / batchSize)} をコミット済み (${updatedCount}/${analysis.tagsFieldCount})`);
            batch = db.batch();
            operationsInBatch = 0;
          }
        } else {
          skippedCount++;
          if (hasTagIds) {
            console.log(`スキップ: ${doc.id} - 既にtagIdsフィールドが存在`);
          } else if (!hasTags) {
            console.log(`スキップ: ${doc.id} - tagsフィールドが存在しない`);
          }
        }
        
      } catch (error) {
        console.error(`エラー (${doc.id}):`, error);
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
    console.log(`- スキップ: ${skippedCount}件`);
    console.log(`- エラー: ${errorCount}件`);
    console.log(`- 総数: ${analysis.total}件`);
    
  } catch (error) {
    console.error('マイグレーションエラー:', error);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  
  migrateTagsToTagIds(isDryRun)
    .then(() => {
      console.log('処理が正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('処理に失敗しました:', error);
      process.exit(1);
    });
}

module.exports = { migrateTagsToTagIds, analyzeCurrentData };