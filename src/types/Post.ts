import { Timestamp } from "firebase/firestore";
import { TimestampLike } from "./Timestamp";

export type Post = {
  id: string;
  title: string;
  url: string;
  description: string;
  tags?: string[]; // 既存の文字列配列（後方互換性）
  tagIds?: string[]; // 新しいタグID配列
  category: string; // 既存の文字列（後方互換性）
  categoryId?: string; // 新しいカテゴリID
  customCategory?: string;
  authorId: string;
  authorName: string;
  thumbnailUrl?: string;
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
};

export type Category = {
  id: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  count?: number; // 統計情報（キャッシュ用）
};