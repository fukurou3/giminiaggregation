'use client';

import { Post } from '@/types/Post';
import { BaseCard } from './BaseCard';

interface WorkCardProps {
  post: Post;
  size?: 'small' | 'medium' | 'large';
  layout?: 'vertical' | 'horizontal';
  showViews?: boolean;
  className?: string;
}

/**
 * ランキング画面など、詳細情報を表示する作品カードコンポーネント
 * - カテゴリ、タグ、説明文、いいね数、閲覧数を表示
 * - BaseCardをラップしてwork variantを適用
 */
export function WorkCard({ post, size = 'medium', layout = 'vertical', showViews = true, className }: WorkCardProps) {
  return (
    <BaseCard 
      post={post} 
      size={size} 
      layout={layout} 
      showViews={showViews} 
      className={className} 
    />
  );
}