/**
 * Zustand Stores Index
 * 全てのストアの統合エクスポート
 */

// Auth Store
export { useAuthStore } from './authStore';
export type { AuthStore, AuthState, AuthActions } from './authStore';

// Post Store
export { usePostStore } from './postStore';
export type { PostStore, PostState, PostActions } from './postStore';

// Column Store (既存)
export { useColumnStore } from './columnStore';

/**
 * ミドルウェア設定用の型定義
 * 将来的にpersist、devtools、immer等のミドルウェアを追加する際に使用
 */
export interface StoreMiddlewareOptions<T = unknown> {
  persist?: {
    name: string;
    partialize?: (state: T) => Partial<T>;
  };
  devtools?: {
    name: string;
    enabled?: boolean;
  };
  immer?: boolean;
}

/**
 * 共通のストア設定
 * 開発環境でのdevtools有効化等
 */
export const STORE_CONFIG = {
  devtools: process.env.NODE_ENV === 'development',
} as const;