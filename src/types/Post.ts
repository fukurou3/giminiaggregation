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