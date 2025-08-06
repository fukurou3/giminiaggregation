import { useMemo, useCallback } from 'react';
import { useFetch } from '@/lib/api';
import { Post } from '@/types/Post';

export interface Category {
  id: string;
  name: string;
  description: string;
}

// 運営設定カテゴリ（投稿画面と同じ）
const PRESET_CATEGORIES: Category[] = [
  { id: 'business', name: 'ビジネス・業務支援', description: '業務効率化、生産性向上、プロジェクト管理など' },
  { id: 'education', name: '学習・教育', description: '勉強支援ツール、教育用コンテンツ、スキルアップ' },
  { id: 'development', name: '開発・テクニカル', description: 'プログラミング、開発支援、技術文書など' },
  { id: 'creative', name: 'クリエイティブ・デザイン', description: 'デザイン、画像生成、クリエイティブ制作' },
  { id: 'knowledge', name: '情報管理・ナレッジ', description: 'データ整理、知識管理、情報収集' },
  { id: 'lifestyle', name: 'ライフスタイル', description: '日常生活、趣味、健康管理など' },
  { id: 'social', name: 'ソーシャル・コミュニケーション', description: 'SNS活用、コミュニケーション支援' },
  { id: 'chatbot', name: 'チャットボット', description: '対話AI、自動応答、カスタマーサポート' },
  { id: 'game', name: 'ゲーム・エンターテインメント', description: 'ゲーム、娯楽、エンターテインメント' },
  { id: 'other', name: 'その他', description: '分類不能なもの、ニッチ系' }
];

interface UseCategoriesDataReturn {
  categories: Category[];
  posts: Post[];
  loading: boolean;
  error: string | null;
  getCategoryCount: (categoryName: string) => number;
  getSelectedCategoryPosts: (selectedCategory: string, limit?: number) => Post[];
}

export const useCategoriesData = (): UseCategoriesDataReturn => {
  // APIから投稿データを取得
  const { data: postsResponse, loading, error } = useFetch<{
    data?: { posts: Post[] };
  }>('/api/posts?limit=100');

  const posts = postsResponse?.data?.posts || [];

  const categories = useMemo(() => {
    // 実際にデータがあるカテゴリを取得（isPublicがundefinedの場合は公開とみなす）
    const actualCategories = [...new Set(posts.filter(post => post.isPublic !== false).map(post => post.category))];
    
    // PRESET_CATEGORIESにない実際のカテゴリを動的に追加
    const additionalCategories = actualCategories
      .filter(categoryName => !PRESET_CATEGORIES.find(preset => preset.name === categoryName))
      .map(categoryName => ({
        id: categoryName.toLowerCase().replace(/[・／\s]+/g, '-'),
        name: categoryName,
        description: `${categoryName}に関する作品`
      }));
    
    // 全カテゴリを表示（データがないものも含む）
    return [...PRESET_CATEGORIES, ...additionalCategories];
  }, [posts]);

  // カテゴリごとの作品数を取得（メモ化）
  const getCategoryCount = useCallback((categoryName: string): number => {
    return posts.filter(post => post.isPublic !== false && post.category === categoryName).length;
  }, [posts]);

  // 選択されたカテゴリの作品を取得（メモ化）
  const getSelectedCategoryPosts = useCallback((selectedCategory: string, limit = 20): Post[] => {
    return posts
      .filter(post => post.isPublic !== false && post.category === selectedCategory)
      .slice(0, limit);
  }, [posts]);

  return {
    categories,
    posts,
    loading,
    error: typeof error === 'string' ? error : null,
    getCategoryCount,
    getSelectedCategoryPosts,
  };
};