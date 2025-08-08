'use client';

import React from 'react';
import { X } from 'lucide-react';
import { TagChip } from './TagChip';
import { Tag } from '@/types/Tag';
import { generateTagId } from '@/lib/tags';

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: (Tag | string)[];
  title?: string;
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
  title = 'すべてのタグ',
  tagProps = {}
}: TagModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] mx-4 overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="モーダルを閉じる"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const tagId = typeof tag === 'string' ? generateTagId(tag) : tag.id;
                return (
                  <TagChip
                    key={tagId}
                    tag={tag}
                    size={tagProps.size}
                    variant={tagProps.variant}
                    showIcon={tagProps.showIcon}
                    showStats={tagProps.showStats}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              タグがありません
            </p>
          )}
        </div>
        
        {/* フッター（オプション） */}
        <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}