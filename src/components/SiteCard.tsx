'use client';

import { Post } from '@/types/Post';
import { BaseCard } from './ui/BaseCard';

interface SiteCardProps {
  post: Post;
}

export function SiteCard({ post }: SiteCardProps) {
  return <BaseCard post={post} variant="site" />;
}