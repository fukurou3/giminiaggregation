import { create } from 'zustand';
import type { ColumnSummary, Column } from '@/types/Column';
import { fetchWithRetry } from '@/lib/api/fetchWithRetry';

interface ColumnState {
  columns: ColumnSummary[];
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  // 個別コラムの詳細情報
  currentColumn: Column | null;
  columnLoading: boolean;
}

interface ColumnActions {
  setColumns: (columns: ColumnSummary[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchColumns: (options?: { limit?: number; featuredOnly?: boolean }) => Promise<void>;
  clearError: () => void;
  // 個別コラム取得
  fetchColumn: (id: string) => Promise<void>;
  setCurrentColumn: (column: Column | null) => void;
  setColumnLoading: (loading: boolean) => void;
}

type ColumnStore = ColumnState & ColumnActions;

export const useColumnStore = create<ColumnStore>((set, get) => ({
  // Initial state
  columns: [],
  loading: false,
  error: null,
  lastFetched: null,
  currentColumn: null,
  columnLoading: false,

  // Actions
  setColumns: (columns) => set({ columns, lastFetched: new Date() }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  setCurrentColumn: (column) => set({ currentColumn: column }),
  setColumnLoading: (loading) => set({ columnLoading: loading }),

  fetchColumns: async (options = {}) => {
    const { limit = 10, featuredOnly = false } = options;
    
    // 既に読み込み中の場合はスキップ
    if (get().loading) return;

    // キャッシュチェック（5分以内は再取得しない）
    const lastFetched = get().lastFetched;
    if (lastFetched && Date.now() - lastFetched.getTime() < 5 * 60 * 1000) {
      return;
    }

    set({ loading: true, error: null });

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(featuredOnly && { featured: 'true' }),
      });

      const response = await fetchWithRetry(`/api/columns?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'コラムの取得に失敗しました');
      }

      // 日付文字列をDateオブジェクトに変換
      const columns = (result.data.columns as ColumnSummary[]).map((column) => ({
        ...column,
        createdAt: new Date(column.createdAt),
        updatedAt: column.updatedAt ? new Date(column.updatedAt) : undefined,
      }));

      set({ 
        columns, 
        loading: false, 
        error: null,
        lastFetched: new Date()
      });

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'コラムの取得中にエラーが発生しました';
        
      console.error('Column fetch error:', error);
      set({ 
        loading: false, 
        error: errorMessage 
      });
    }
  },

  fetchColumn: async (id: string) => {
    // 既に同じコラムが読み込み中の場合はスキップ
    if (get().columnLoading) return;

    set({ columnLoading: true, error: null });

    try {
      const response = await fetchWithRetry(`/api/columns/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'コラムの取得に失敗しました');
      }

      // 日付文字列をDateオブジェクトに変換
      const column = {
        ...result.data.column,
        createdAt: new Date(result.data.column.createdAt),
        updatedAt: result.data.column.updatedAt ? new Date(result.data.column.updatedAt) : undefined,
      };

      set({ 
        currentColumn: column, 
        columnLoading: false, 
        error: null 
      });

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'コラムの取得中にエラーが発生しました';
        
      console.error('Column fetch error:', error);
      set({ 
        columnLoading: false, 
        error: errorMessage 
      });
    }
  },
}));