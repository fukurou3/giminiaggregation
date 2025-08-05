'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Column } from '@/types/Column';
import ColumnDetail from '@/components/columns/ColumnDetail';

interface ColumnModalProps {
  column: Column;
  isOpen: boolean;
  onClose: () => void;
}

export function ColumnModal({ column, isOpen, onClose }: ColumnModalProps) {

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // スクロールを無効化
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景オーバーレイ - ぼかし効果を強化 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-lg"
        onClick={onClose}
      />
      
      {/* モーダルコンテンツ - note.comスタイル */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex justify-end p-6 border-b border-gray-100">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="モーダルを閉じる"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="overflow-y-auto max-h-[calc(90vh-72px)] p-6">
          <ColumnDetail column={column} />
        </div>
      </div>
    </div>
  );
}