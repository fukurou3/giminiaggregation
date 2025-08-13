# セキュリティ強化・tmp残骸自動削除 実装完了

## ✅ 追加実装完了

### 1. セキュリティ強化（DoS対策）

#### **総ピクセル・フレーム数上限**
- **25MP ピクセル上限**: `MAX_PIXELS = 25 * 1024 * 1024` (post用既定と同一)
- **300 フレーム上限**: `MAX_FRAMES = 300` (アニメーションGIF等DoS対策)
- **サーバーサイド検証**: `functions/src/imageProcessor.ts`
  ```typescript
  // 3. Check pixel count
  const totalPixels = metadata.width * metadata.height;
  if (totalPixels > MAX_PIXELS) {
    return { success: false, error: `Image too large: ${totalPixels} pixels (max: ${MAX_PIXELS})` };
  }

  // 4. Check frame count for animated images
  if (metadata.pages && metadata.pages > MAX_FRAMES) {
    return { success: false, error: `Too many frames: ${metadata.pages} (max: ${MAX_FRAMES})` };
  }
  ```

#### **フロントエンド同期**
- **定数統一**: `src/lib/utils/imageUtils.ts`
  ```typescript
  // 定数定義 (サーバーサイドと同期)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (フロントエンド制限)
  const MAX_PIXELS = 25 * 1024 * 1024; // 25MP (DoS対策)
  const MAX_FRAMES = 300; // フレーム数上限
  const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
  ```

### 2. tmp残骸自動削除システム

#### **即座削除（成功時）**
- **3回リトライ**: 指数バックオフで削除リトライ
- **`cleanupTmpFile()`**: 成功時の即座削除関数
  ```typescript
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      await file.delete();
      console.log(`Deleted tmp file: ${filePath}`);
      return;
    } catch (error) {
      retryCount++;
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    }
  }
  ```

#### **失敗時スケジューリング**
- **24時間後削除**: デバッグのため一時保持後に削除
- **`scheduleFailedFileCleanup()`**: Firestore にスケジュール記録
- **フォールバック**: スケジューリング失敗時は即座削除

#### **デイリー自動クリーンアップ** (`functions/src/tmpCleanup.ts`)
- **スケジュール実行**: 毎日 2:00 AM JST (`'0 2 * * *'`)
- **`dailyTmpCleanup`**: Cloud Function スケジューラー
  ```typescript
  export const dailyTmpCleanup = functions
    .runWith({
      timeoutSeconds: 540,
      memory: '1GB'
    })
    .pubsub
    .schedule('0 2 * * *')  // Daily at 2:00 AM JST
    .timeZone('Asia/Tokyo')
    .onRun(async (context) => {
      // 1. Clean up scheduled failed files
      await cleanupScheduledFiles(db, bucket);
      
      // 2. Clean up orphaned tmp files (older than 24 hours)
      await cleanupOrphanedTmpFiles(bucket);
      
      // 3. Monitor tmp directory metrics
      await monitorTmpMetrics(bucket, db);
    });
  ```

#### **メトリクス監視**
- **tmpファイル数監視**: `/tmp 存在数` メトリクス
- **年齢別分類**: recent(<1h), old(1-24h), veryOld(>24h)
- **アラート機能**: 
  - `veryOld > 10`: 24時間超過ファイル警告
  - `tmpFileCount > 1000`: 高ファイル数警告
- **Firestore保存**: `tmpMetrics` コレクション
  ```typescript
  const metrics = {
    tmpFileCount,
    recentFiles, // < 1 hour
    oldFiles,    // 1-24 hours
    veryOldFiles, // > 24 hours (should be 0)
    totalSizeMB: Math.round(totalSize / (1024 * 1024)),
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };
  ```

#### **緊急時対応**
- **`manualTmpCleanup`**: 管理者用手動クリーンアップ
- **Admin権限必須**: `context.auth?.token.admin`
- **HTTPS Callable**: 緊急時呼び出し可能

## 🔧 運用監視ポイント

### 1. メトリクス確認
```bash
# Cloud Functions ログで確認
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=dailyTmpCleanup" --limit=10

# メトリクス検索
# ログ: "TMP_METRICS:"
# アラート: "ALERT:", "WARNING:"
```

### 2. 異常値判定
- **veryOldFiles > 0**: 削除プロセス異常
- **tmpFileCount > 1000**: 大量アップロード or 削除遅延
- **totalSizeMB > 1000**: ストレージ使用量異常

### 3. トラブルシューティング
```typescript
// 緊急手動クリーンアップ
const functions = require('firebase-functions');
await functions().httpsCallable('manualTmpCleanup')();

// Firestore確認
db.collection('tmpCleanupSchedule').where('status', '==', 'scheduled').get()
db.collection('tmpMetrics').orderBy('timestamp', 'desc').limit(7).get()
```

## 📋 Phase F 準備完了

全てのセキュリティ強化とクリーンアップシステムが実装完了しました：

✅ **DoS対策**: 25MP・300フレーム上限  
✅ **自動削除**: 成功時即座削除・失敗時24h後削除  
✅ **デイリークリーンアップ**: orphan ファイル対策  
✅ **メトリクス監視**: リアルタイム監視・アラート  
✅ **緊急対応**: 手動クリーンアップ機能  

**Phase F: 旧経路停止・最終移行** に進む準備が整いました。