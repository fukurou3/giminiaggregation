import { StateCreator } from 'zustand';

/**
 * ミドルウェア設定オプション
 */
export interface MiddlewareOptions {
  name?: string;
  persist?: boolean;
  devtools?: boolean;
}

/**
 * 開発環境でのDevToolsミドルウェア設定
 */
export const createDevToolsConfig = (name: string) => ({
  name,
  enabled: process.env.NODE_ENV === 'development',
});

/**
 * 永続化ミドルウェア用のヘルパー
 * 将来的にzustand/middlewareのpersistを使用する際の設定
 */
export const createPersistConfig = <T = unknown>(name: string, options?: {
  partialize?: (state: T) => Partial<T>;
  version?: number;
}) => ({
  name: `giminiaggregation-${name}`,
  version: options?.version || 1,
  partialize: options?.partialize,
});

/**
 * ロギングミドルウェア（開発環境のみ）
 */
export const logger = <T>(
  config: StateCreator<T>,
  name?: string
): StateCreator<T> => (set, get, api) =>
  config(
    (args) => {
      if (process.env.NODE_ENV === 'development') {
        console.group(`🔄 [${name || 'Store'}] State Update`);
        console.log('Previous State:', get());
        set(args);
        console.log('Next State:', get());
        console.groupEnd();
      } else {
        set(args);
      }
    },
    get,
    api
  );

/**
 * エラーハンドリングミドルウェア
 */
export const errorHandler = <T>(
  config: StateCreator<T>,
  name?: string
): StateCreator<T> => (set, get, api) =>
  config(
    (args) => {
      try {
        set(args);
      } catch (error) {
        console.error(`❌ [${name || 'Store'}] Error in state update:`, error);
        throw error;
      }
    },
    get,
    api
  );