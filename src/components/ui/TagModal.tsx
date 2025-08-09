'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { TagChip } from './TagChip';
import { Tag } from '@/types/Tag';
import { generateTagId } from '@/lib/tags';

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: (Tag | string)[];
  postTitle?: string;
  tagProps?: {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'outlined' | 'ghost';
    showIcon?: boolean;
    showStats?: boolean;
  };
}

export function TagModal({
  isOpen,
  onClose,
  tags,
  postTitle,
  tagProps = {}
}: TagModalProps) {
  const router = useRouter();
  
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const handleTagClick = (tag: Tag | string, e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(); // モーダルを閉じる
    
    // タグ名を取得
    const tagName = typeof tag === 'string' ? tag : tag.name;
    
    // タグページに遷移（URLエンコードして安全に）
    router.push(`/search/${encodeURIComponent(tagName)}`);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (document.body.style.overflow === 'hidden') {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-background rounded-lg shadow-xl border border-border w-full max-w-4xl max-h-[90vh] mx-4 overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-start justify-between p-6 pb-0">
          <div className="flex-1 pr-4">
            {postTitle && (
              <h2 className="text-sm font-medium text-foreground line-clamp-2 mb-3">
                {postTitle}
              </h2>
            )}
            
            {/* タグ表示 */}
            <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2 pb-6">
                  {tags.map((tag) => {
                    const tagId = typeof tag === 'string' ? generateTagId(tag) : tag.id;
                    return (
                      <TagChip
                        key={tagId}
                        tag={tag}
                        size={tagProps.size || 'md'}
                        variant={tagProps.variant || 'default'}
                        showIcon={tagProps.showIcon !== false}
                        showStats={false}
                        clickable={true}
                        onClick={(e) => handleTagClick(tag, e)}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  タグがありません
                </p>
              )}
            </div>
          </div>
          
          <button
            onClick={handleCloseClick}
            className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors flex-shrink-0"
            aria-label="モーダルを閉じる"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}