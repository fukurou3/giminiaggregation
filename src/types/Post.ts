import { Timestamp } from "firebase/firestore";
import { TimestampLike } from "./Timestamp";

export type Post = {
  id: string;
  title: string;
  url: string;
  description: string;
  tagIds: string[]; // タグID配列
  categoryId: string; // カテゴリID
  customCategory?: string;
  authorId: string;
  authorUsername: string;  // ユーザーの公開ハンドル
  authorPublicId: string;  // ユーザーのpublicID（URL用）
  // 最新画像スキーマ
  thumbnail: string; // サムネイル画像URL（必須）
  prImages?: string[]; // PR画像URL配列
  ogpTitle?: string;
  ogpDescription?: string;
  ogpImage?: string;
  isPublic: boolean;
  createdAt: Timestamp | TimestampLike;
  updatedAt: Timestamp | TimestampLike;
  likes: number;
  favoriteCount: number;
  views: number;
  featured: boolean;
  // コンセプト詳細フィールド（任意項目）
  problemBackground?: string; // 課題・背景
  useCase?: string;           // 想定シーン・利用者
  uniquePoints?: string;      // 差別化ポイント
  futureIdeas?: string;       // 応用・発展アイデア
  acceptInterview?: boolean;  // 運営取材の受け入れ
};

export type Category = {
  id: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  count?: number; // 統計情報（キャッシュ用）
};