# 運用マニュアル

## 異常発生時のリカバリ手順
1. Firebase コンソールで該当ポストの `favorites` と `favoriteShards` を確認。
2. `favoriteShards` の合計値を算出し、`favoriteCount` キャッシュと不整合があれば Cloud Function を再実行。
3. 状況をドキュメント化し、RCA フォーマットに沿って原因を特定する。

## 定期バックアップ＆リストア
1. `gcloud firestore export gs://<bucket>` を月次で実行。
2. リストア時は `gcloud firestore import` を利用し、必要なコレクションのみ復旧する。

### favorites サブコレクションのエクスポート
1. `gcloud firestore export gs://<bucket> --collection-ids=posts/<postId>/favorites` を実行。
2. Cloud Audit Logs も `gcloud logging read "resource.type=firestore_database" --format=json > audit.json` で取得。
3. エクスポートしたデータと `audit.json` を証跡として保存する。

## Cold Start 対策
1. 2nd Gen Cloud Functions を利用し `minInstances` を設定する。
2. 高負荷時は Cloud Run と Cloud Scheduler で Warmup API を定期呼び出し。

## お気に入り数サンプリング突合レポートテンプレート
```
- 期間: 2024-01-01 ~ 2024-01-31
- サンプル数: 100 posts
- 差分件数: 0
- コメント:
```

### 合計件数と実ドキュメント数の突合レポート
```
- 期間: 2024-01-01 ~ 2024-01-31
- 対象コレクション: posts
- 計算方法:
  - favoriteShards の合計値: XXX
  - favorites ドキュメント数: YYY
- 差分: (XXX - YYY)
- 備考:
```

## 不審IP検知スクリプト
- Cloud Logging から抽出した `favorite-logs.json` を対象に `node scripts/analyze-favorites.ts` を実行し、1 IP からの大量 Like を検出する。

## インシデント後 RCA フォーマット
```
### 1. 概要
- 発生日:
- 影響範囲:

### 2. 原因

### 3. 対応

### 4. 再発防止策
```
