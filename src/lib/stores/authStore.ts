import { create } from 'zustand';
import { User } from 'firebase/auth';

/**
 * 認証関連の状態を管理するストア
 */
export interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
}

/**
 * 認証関連のアクション
 */
export interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
}

/**
 * AuthStoreの型定義
 */
export type AuthStore = AuthState & AuthActions;

/**
 * 認証ストアの初期状態
 */
const initialState: AuthState = {
  user: null,
  loading: false, // 一時的にfalseに設定してテスト
  initialized: false,
};

/**
 * 認証状態管理ストア
 * ユーザー情報、ローディング状態、初期化状態を管理
 */
export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  
  // ユーザー情報を設定
  setUser: (user) => set({ user }),
  
  // ローディング状態を設定
  setLoading: (loading) => set({ loading }),
  
  // 初期化状態を設定
  setInitialized: (initialized) => set({ initialized }),
}));