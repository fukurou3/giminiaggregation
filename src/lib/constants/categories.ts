import { Category } from "@/types/Post";

// Core category configurations with ID-based structure
export const CATEGORY_MASTERS: Category[] = [
  { id: "business", name: "ビジネス・業務支援", description: "業務効率化、生産性向上、プロジェクト管理など", icon: "💼", sortOrder: 1 },
  { id: "education", name: "学習・教育", description: "勉強支援ツール、教育用コンテンツ、スキルアップ", icon: "🎓", sortOrder: 2 },
  { id: "development", name: "開発・テクニカル", description: "プログラミング、開発支援、技術文書など", icon: "💻", sortOrder: 3 },
  { id: "creative", name: "クリエイティブ・デザイン", description: "デザイン、画像生成、クリエイティブ制作", icon: "🎨", sortOrder: 4 },
  { id: "knowledge", name: "情報管理・ナレッジ", description: "データ整理、知識管理、情報収集", icon: "📊", sortOrder: 5 },
  { id: "lifestyle", name: "ライフスタイル", description: "日常生活、趣味、健康管理など", icon: "🏠", sortOrder: 6 },
  { id: "social", name: "ソーシャル・コミュニケーション", description: "SNS活用、コミュニケーション支援", icon: "💬", sortOrder: 7 },
  { id: "chatbot", name: "チャットボット", description: "対話AI、自動応答、カスタマーサポート", icon: "🤖", sortOrder: 8 },
  { id: "game", name: "ゲーム・エンターテインメント", description: "ゲーム、娯楽、エンターテインメント", icon: "🎮", sortOrder: 9 },
  { id: "other", name: "その他／未分類", description: "分類不能なもの、ニッチ系", icon: "📦", sortOrder: 10 }
] as const;

// Helper functions for category operations
export const findCategoryById = (id: string): Category | undefined => {
  return CATEGORY_MASTERS.find(cat => cat.id === id);
};

export const findCategoryByName = (name: string): Category | undefined => {
  return CATEGORY_MASTERS.find(cat => cat.name === name);
};

// Get all category IDs as a typed array
export const CATEGORY_IDS = CATEGORY_MASTERS.map(cat => cat.id) as string[];

// Legacy support - will be removed in future versions
export interface CategoryOption {
  value: string;
  label: string;
  description: string;
}

export interface CategoryConfig {
  name: string;
  description: string;
}

// @deprecated Use CATEGORY_MASTERS with findCategoryById instead
export const CATEGORIES: CategoryOption[] = CATEGORY_MASTERS.map(cat => ({
  value: cat.name,
  label: cat.name,
  description: cat.description
}));

// @deprecated Use findCategoryByName instead  
export const findCategoryByValue = (value: string): CategoryOption | undefined => {
  return CATEGORIES.find(cat => cat.value === value);
};