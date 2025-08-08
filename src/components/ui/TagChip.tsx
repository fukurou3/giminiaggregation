'use client';

import Link from 'next/link';
import { Hash, CheckCircle, TrendingUp } from 'lucide-react';
import { Tag } from '@/types/Tag';
import { generateTagId } from '@/lib/tags';

interface TagChipProps {
  tag: Tag | string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'ghost';
  showIcon?: boolean;
  showStats?: boolean;
  clickable?: boolean;
  className?: string;
  title?: string;
  onClick?: () => void;
  maxWidth?: number; // コンテナ幅に基づく動的制限用
}

export function TagChip({
  tag,
  size = 'md',
  variant = 'default',
  showIcon = true,
  showStats = false,
  clickable = true,
  className = '',
  title,
  onClick,
  maxWidth
}: TagChipProps) {
  // 文字列の場合は基本的なタグオブジェクトを作成
  const tagObj: Tag = typeof tag === 'string' 
    ? {
        id: generateTagId(tag),
        name: tag,
        aliases: [],
        count: 0,
        isOfficial: false,
        views: 0,
        favorites: 0,
        flagged: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    : tag;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const variantClasses = {
    default: 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20',
    outlined: 'bg-transparent text-foreground border border-border hover:bg-muted',
    ghost: 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
  };

  const iconSize = {
    sm: 12,
    md: 14,
    lg: 16
  };

  const chipContent = (
    <span 
      className={`
        inline-flex items-center space-x-1 rounded-full font-medium transition-colors
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${clickable ? 'cursor-pointer' : 'cursor-default'}
        ${className}
      `}
      title={title || tagObj.name}
      onClick={onClick}
    >
      {showIcon && <Hash className="flex-shrink-0" size={iconSize[size]} />}
      
      <span 
        className="truncate"
        style={{
          whiteSpace: 'nowrap',
          wordBreak: 'keep-all', 
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: maxWidth ? `${Math.min(400, maxWidth * 0.7)}px` : '30ch' // ハイブリッド制限（緩和版）
        }}
      >
        {tagObj.name}
      </span>
      
      {tagObj.isOfficial && (
        <CheckCircle className="flex-shrink-0 text-blue-600" size={iconSize[size]} />
      )}
      
      {showStats && tagObj.count > 0 && (
        <span className="text-xs opacity-75 ml-1">
          ({tagObj.count.toLocaleString()})
        </span>
      )}
      
      {showStats && (tagObj.views > 1000 || tagObj.favorites > 100) && (
        <TrendingUp className="flex-shrink-0 text-green-600" size={iconSize[size]} />
      )}
    </span>
  );

  if (!clickable || onClick) {
    return chipContent;
  }

  return (
    <Link href={`/search/${tagObj.id}`} className="inline-block">
      {chipContent}
    </Link>
  );
}