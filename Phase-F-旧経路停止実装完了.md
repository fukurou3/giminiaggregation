# Phase F: 旧経路停止・最終移行 実装完了

## ✅ 実装完了内容

### 1. Legacy API 段階的非推奨化

#### **API エンドポイント非推奨化**
- **`/api/upload-profile-image`**: 非推奨警告追加
  ```typescript
  // DEPRECATION WARNING
  console.warn('[DEPRECATED] upload-profile-image API is deprecated. Use unified image pipeline with avatar mode instead.');
  
  // レスポンスに移行ガイダンス
  return createSuccessResponse({
    url: signedUrl,
    fileName,
    deprecated: true,
    migrationNote: 'この API は非推奨です。新しい統合画像パイプライン（avatar mode）をご利用ください。'
  });
  ```

#### **クライアント関数非推奨化**
- **`uploadProfileImage()`**: JSDoc 非推奨マーク + コンソール警告
  ```typescript
  /**
   * @deprecated この関数は非推奨です。新しい統合画像パイプライン（ImageUploader with avatar mode）を使用してください。
   */
  export async function uploadProfileImage(uid: string, file: File) {
    console.warn('[DEPRECATED] uploadProfileImage is deprecated. Use unified image pipeline with avatar mode instead.');
    // ... existing implementation with warnings
  }
  ```

### 2. バッチ移行システム

#### **プロフィール画像バッチ移行** (`functions/src/profileMigration.ts`)
- **`migrateProfileImages`**: Admin 用 Callable Function
  ```typescript
  export const migrateProfileImages = functions
    .runWith({
      timeoutSeconds: 540,
      memory: '2GB',
      maxInstances: 5
    })
    .https
    .onCall(async (data, context) => {
      // Admin権限検証
      if (!context.auth?.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
      }
      
      // バッチ処理（50件ずつ）
      const { batchSize = 50, startAfter = null, dryRun = false } = data;
      // Legacy プロフィール画像を新パイプライン形式に変換
    });
  ```

#### **移行処理詳細**
- **Legacy URL検出**: 署名URL・GCS URL パターン識別
- **1:1変換**: Sharp で正方形切り抜き + 256px/512px 生成
- **CDN配置**: `/public/avatars/hash_size.webp` 形式
- **メタデータ保存**: 移行履歴・ハッシュ・URL対応
- **Firestore更新**: `photoURLMigrated: true` フラグ

#### **移行統計API** (`/api/admin/migration-status`)
- **GET**: 移行統計・最近の活動・エラー統計
- **POST**: バッチ移行開始・レガシーデータクリーンアップ
- **Admin権限**: 管理者のみアクセス可能

### 3. ユーザー体験向上

#### **マイグレーション提案バナー**
- **Legacy URL検出**: `shouldMigrateImage()` でLegacy画像特定
- **プロフィール設定画面**: 最適化提案バナー表示
  ```typescript
  // Check if migration suggestion should be shown
  if (shouldMigrateImage(userProfile.photoURL) && !userProfile.photoURLMigrated) {
    setShowMigrationSuggestion(true);
  }
  ```
- **非侵入的UI**: 後で・非表示ボタンで選択可能

#### **自動切り替え**
- **新規アップロード**: 自動的に統合パイプライン使用
- **URL最適化**: `getAvatarDisplayUrl()` で最適サイズ配信
- **フォールバック**: Legacy URL でも正常表示

### 4. 監視・運用体制

#### **移行メトリクス**
- **総数統計**: total, migrated, legacy, withoutPhoto
- **進捗率**: `migrationProgress = migrated / (migrated + legacy) * 100`
- **最近の活動**: 直近20件の移行記録
- **エラー分析**: 24時間以内のエラー種別・件数

#### **管理機能**
- **ドライラン**: 実際の移行前の影響確認
- **バッチサイズ調整**: 負荷に応じて調整可能
- **エラー追跡**: 失敗原因・対象ユーザー特定

## 🔧 運用フロー

### Phase F-1: 段階的非推奨化 ✅
1. **Legacy API**: 警告追加・移行ガイダンス提供
2. **クライアント関数**: 非推奨マーク・代替案提示
3. **ユーザー告知**: プロフィール設定で最適化提案

### Phase F-2: バッチ移行 (準備完了)
```bash
# 移行統計確認
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://your-domain.com/api/admin/migration-status

# ドライラン実行
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"action": "start_migration", "batchSize": 10, "dryRun": true}' \
  https://your-domain.com/api/admin/migration-status

# 実際の移行実行
const migrate = firebase.functions().httpsCallable('migrateProfileImages');
await migrate({ batchSize: 50, dryRun: false });
```

### Phase F-3: 旧コード削除 (次段階)
1. **Legacy API削除**: `/api/upload-profile-image` 完全停止
2. **未使用関数削除**: `uploadProfileImage()` 等
3. **依存関係整理**: 不要な import・パッケージ削除

## 📊 実装ファイル構成

### Cloud Functions
- **`functions/src/profileMigration.ts`** - バッチ移行・統計取得
- **`functions/src/index.ts`** - 移行関数エクスポート

### API Routes
- **`src/app/api/upload-profile-image/route.ts`** - 非推奨化
- **`src/app/api/admin/migration-status/route.ts`** - 移行監視

### Frontend
- **`src/lib/userProfile.ts`** - 関数非推奨化
- **`src/app/settings/profile/page.tsx`** - 移行提案バナー
- **`src/lib/utils/imageUrlHelpers.ts`** - URL分析・最適化

## 🎯 次のステップ

### 即座実行可能
1. **ドライラン移行**: 影響範囲確認
2. **段階的バッチ移行**: 少数ユーザーから開始
3. **メトリクス監視**: 移行状況・エラー率

### 移行完了後
1. **Legacy API停止**: 完全無効化
2. **旧コード削除**: クリーンアップ
3. **パフォーマンス測定**: CDN効果・応答時間

---

**Phase F 実装完了** - 統合画像処理パイプラインへの完全移行準備が整いました！