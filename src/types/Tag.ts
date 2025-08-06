import { Timestamp } from "firebase/firestore";
import { TimestampLike } from "./Timestamp";

export type Tag = {
  id: string;
  name: string;
  aliases: string[];
  count: number;
  isOfficial: boolean;
  views: number;
  favorites: number;
  flagged: boolean;
  createdAt: Timestamp | TimestampLike;
  updatedAt: Timestamp | TimestampLike;
};

export type TagReport = {
  id: string;
  tagId: string;
  reason: string;
  userId: string;
  createdAt: Timestamp | TimestampLike;
};

export type TagCategoryCount = {
  id: string;
  tagId: string;
  categoryId: string;
  count: number;
  updatedAt: Timestamp | TimestampLike;
};

export type TagSearchResult = {
  tag: Tag;
  totalCount: number;
  categoryStats: {
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    count: number;
  }[];
};