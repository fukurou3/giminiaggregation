'use client';

import { Post } from '@/types/Post';
import { BaseCard } from './BaseCard';

interface WorkCardProps {
  post: Post;
  size?: 'small' | 'medium' | 'large';
  layout?: 'vertical' | 'horizontal';
  className?: string;
}

export function WorkCard({ post, size = 'medium', layout = 'vertical', className }: WorkCardProps) {
  return <BaseCard post={post} size={size} variant="work" layout={layout} className={className} />;
}