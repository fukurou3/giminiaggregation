# Firestore インデックス設定ガイド

## 必要なインデックス

### 1. 基本的な複合インデックス
コラム機能で必要な複合インデックスを設定してください。

#### コレクション: `columns`
以下のフィールドの組み合わせでインデックスを作成：

**インデックス 1: 公開記事の日付順**
- `isPublished` (昇順)
- `createdAt` (降順)

**インデックス 2: 注目記事の日付順**
- `isPublished` (昇順)
- `featured` (昇順)
- `createdAt` (降順)

### 2. Firebase Console での設定手順

1. **Firebase Console にアクセス**
   - https://console.firebase.google.com/
   - プロジェクト `giminiaggregation` を選択

2. **Firestore Database を開く**
   - 左メニューの「Firestore Database」をクリック

3. **インデックスタブを選択**
   - 上部タブの「インデックス」をクリック

4. **複合インデックスを作成**
   - 「インデックスを作成」ボタンをクリック
   - 以下の設定で作成：

#### インデックス設定 1
```
コレクション: columns
フィールド:
  - isPublished: 昇順
  - createdAt: 降順
```

#### インデックス設定 2
```
コレクション: columns
フィールド:
  - isPublished: 昇順
  - featured: 昇順
  - createdAt: 降順
```

### 3. 自動インデックス作成
エラーログに表示されたリンクをクリックすることで、必要なインデックスを自動作成できます：

エラーメッセージから：
```
https://console.firebase.google.com/v1/r/project/giminiaggregation/firestore/indexes?create_composite=...
```

このリンクをクリックして「作成」ボタンを押すだけで完了します。

### 4. インデックス作成の確認

インデックスが作成されると：
- ステータスが「構築中」→「有効」に変わります
- 通常、数分で完了します
- 大量のデータがある場合は時間がかかることがあります

### 5. トラブルシューティング

#### インデックス作成が完了しない場合
- Firebase Console でインデックスの状態を確認
- 「エラー」状態の場合は削除して再作成

#### 権限エラーが発生する場合
- Firebase プロジェクトの管理者権限を確認
- IAM 設定で Firestore の編集権限があることを確認

## 現在のAPI状況

### ✅ 動作するクエリ
```javascript
// 公開記事のみ（基本インデックスで動作）
where('isPublished', '==', true)
orderBy('createdAt', 'desc')
```

### ❌ 複合インデックスが必要なクエリ
```javascript
// 注目記事のフィルタ（複合インデックス必要）
where('isPublished', '==', true)
where('featured', '==', true)
orderBy('createdAt', 'desc')
```

## 次のステップ

1. 上記の手順でインデックスを作成
2. インデックス作成完了を確認
3. ColumnSection.tsx の featuredOnly を再度有効化
4. 動作テスト実行

インデックス作成完了後、以下のコマンドで動作確認：
```bash
curl "http://localhost:3000/api/columns?limit=3&featured=true"
```