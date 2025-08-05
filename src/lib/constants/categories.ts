export interface CategoryOption {
  value: string;
  label: string;
  description: string;
}

export interface CategoryConfig {
  name: string;
  description: string;
}

// Core category configurations
const CATEGORY_CONFIGS: CategoryConfig[] = [
  { name: "ビジネス・業務支援", description: "業務効率化、生産性向上、プロジェクト管理など" },
  { name: "学習・教育", description: "勉強支援ツール、教育用コンテンツ、スキルアップ" },
  { name: "開発・テクニカル", description: "プログラミング、開発支援、技術文書など" },
  { name: "クリエイティブ・デザイン", description: "デザイン、画像生成、クリエイティブ制作" },
  { name: "情報管理・ナレッジ", description: "データ整理、知識管理、情報収集" },
  { name: "ライフスタイル", description: "日常生活、趣味、健康管理など" },
  { name: "ソーシャル・コミュニケーション", description: "SNS活用、コミュニケーション支援" },
  { name: "チャットボット", description: "対話AI、自動応答、カスタマーサポート" },
  { name: "ゲーム・エンターテインメント", description: "ゲーム、娯楽、エンターテインメント" },
  { name: "その他／未分類", description: "分類不能なもの、ニッチ系" }
] as const;

// Generate CategoryOption array from configs (for backward compatibility)
export const CATEGORIES: CategoryOption[] = CATEGORY_CONFIGS.map(config => ({
  value: config.name,
  label: config.name,
  description: config.description
}));

export const findCategoryByValue = (value: string): CategoryOption | undefined => {
  return CATEGORIES.find(cat => cat.value === value);
};