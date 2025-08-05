import { create } from 'zustand';
import { Post, Category } from '@/types/Post';
import { ColumnSummary } from '@/types/Column';
import { TopicHighlight } from '@/types/Topic';

/**
 * 投稿関連の状態を管理するストア
 */
export interface PostState {
  posts: Post[];
  categories: Category[];
  columns: ColumnSummary[];
  topicHighlights: TopicHighlight[];
  searchQuery: string;
  selectedCategory: string;
}

/**
 * 投稿関連のアクション
 */
export interface PostActions {
  // データセット系
  setPosts: (posts: Post[]) => void;
  setCategories: (categories: Category[]) => void;
  setColumns: (columns: ColumnSummary[]) => void;
  setTopicHighlights: (topicHighlights: TopicHighlight[]) => void;
  
  // 検索・フィルター系
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  
  // 投稿CRUD操作
  addPost: (post: Post) => void;
  updatePost: (id: string, post: Partial<Post>) => void;
  deletePost: (id: string) => void;
}

/**
 * PostStoreの型定義
 */
export type PostStore = PostState & PostActions;

/**
 * 投稿ストアの初期状態
 */
const initialState: PostState = {
  posts: [],
  categories: [],
  columns: [],
  topicHighlights: [],
  searchQuery: '',
  selectedCategory: '',
};

/**
 * 投稿・コンテンツ状態管理ストア
 * 投稿データ、カテゴリ、コラム、検索状態を管理
 */
export const usePostStore = create<PostStore>((set) => ({
  ...initialState,
  
  // データセット系アクション
  setPosts: (posts) => set({ posts }),
  setCategories: (categories) => set({ categories }),
  setColumns: (columns) => set({ columns }),
  setTopicHighlights: (topicHighlights) => set({ topicHighlights }),
  
  // 検索・フィルター系アクション
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  
  // 投稿CRUD操作
  addPost: (post) => set((state) => ({ 
    posts: [post, ...state.posts] 
  })),
  
  updatePost: (id, updatedPost) => 
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === id ? { ...post, ...updatedPost } : post
      ),
    })),
  
  deletePost: (id) =>
    set((state) => ({
      posts: state.posts.filter((post) => post.id !== id),
    })),
}));