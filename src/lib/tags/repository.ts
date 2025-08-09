import { Tag } from '@/types/Tag';
import { getPopularTags } from '@/lib/tags';

/**
 * タグリポジトリ - Firestoreからのタグデータ取得を集約
 */
export class TagRepository {
  /**
   * 人気タグを取得（AI生成時の既存タグとして使用）
   */
  static async getPopularTagsForAI(): Promise<string[]> {
    try {
      // 人気上位200件を取得
      const popularTags = await getPopularTags(200);
      return popularTags.map(tag => tag.name);
    } catch (error) {
      console.error('Failed to fetch popular tags for AI:', error);
      return [];
    }
  }

  /**
   * 最近使用されたタグを取得（将来の拡張用）
   */
  static async getRecentTags(limit = 200): Promise<Tag[]> {
    // TODO: 実装予定 - 最近使用されたタグの取得
    // updatedAt 順でソートしたタグを返す
    return [];
  }

  /**
   * AIで使用する既存タグのリストを取得
   * 人気タグ + 最近のタグを組み合わせ
   */
  static async getExistingTagsForAI(): Promise<string[]> {
    const [popularTags, recentTags] = await Promise.all([
      this.getPopularTagsForAI(),
      this.getRecentTags(100)
    ]);

    const recentTagNames = recentTags.map(tag => tag.name);
    
    // 重複を除去して結合
    const combined = Array.from(new Set([...popularTags, ...recentTagNames]));
    
    // 最大400個に制限
    return combined.slice(0, 400);
  }
}