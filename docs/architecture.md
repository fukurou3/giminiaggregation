# アーキテクチャ概要

## シーケンス図: お気に入りトグル

```mermaid
sequenceDiagram
  participant U as User
  participant C as Client
  participant A as API
  participant F as Firestore

  U->>C: Toggle Favorite
  C->>A: Verify reCAPTCHA
  A-->>C: Score
  C->>F: Transaction (favorites doc & shard)
  F-->>C: Commit
  C->>F: Aggregate favoriteShards (read)
  C-->>U: 更新されたお気に入り数
```

## Firestore スキーマ

```mermaid
erDiagram
  POSTS ||--o{ FAVORITES : has
  POSTS ||--o{ FAVORITESHARDS : has
  FAVORITES {
    string uid
    timestamp createdAt
  }
  FAVORITESHARDS {
    number count
  }
  POSTS {
    number favoriteCount
    ...
  }
```

`favoriteCount` フィールドは Cloud Function またはクライアント集計でキャッシュされます。
