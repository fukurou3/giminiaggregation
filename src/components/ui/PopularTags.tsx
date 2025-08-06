'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Hash } from 'lucide-react';
import { TagChip } from './TagChip';
import { useFetch } from '@/lib/api';
import { Tag } from '@/types/Tag';

interface PopularTagsProps {
  title?: string;
  limit?: number;
  sortBy?: 'count' | 'views' | 'favorites' | 'combined';
  size?: 'sm' | 'md' | 'lg';
  showStats?: boolean;
  className?: string;
}

interface PopularTagsResponse {
  data: { tags: Tag[] };
}

export function PopularTags({
  title = '人気タグ',
  limit = 10,
  sortBy = 'combined',
  size = 'md',
  showStats = true,
  className = ''
}: PopularTagsProps) {
  const { data: response, loading, error } = useFetch<PopularTagsResponse>(
    `/api/tags/popular?limit=${limit}&sortBy=${sortBy}`
  );

  const tags = response?.data?.tags || [];

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <h3 className="font-semibold text-foreground flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          {title}
        </h3>
        <div className="flex flex-wrap gap-2">
          {[...Array(limit)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-muted rounded-full h-8 w-16"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || tags.length === 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        <h3 className="font-semibold text-foreground flex items-center">
          <Hash className="w-5 h-5 mr-2" />
          {title}
        </h3>
        <p className="text-muted-foreground text-sm">
          タグが見つかりませんでした
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="font-semibold text-foreground flex items-center">
        <TrendingUp className="w-5 h-5 mr-2" />
        {title}
      </h3>
      
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            size={size}
            showStats={showStats}
            variant="default"
          />
        ))}
      </div>
    </div>
  );
}