'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Flag } from 'lucide-react';
import { PostReportReason, CreatePostReportRequest } from '@/types/PostReport';

interface ReportPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPostId: string;
  targetPostTitle: string;
  onSubmit: (reportData: CreatePostReportRequest) => Promise<void>;
}

export function ReportPostModal({
  isOpen,
  onClose,
  targetPostId,
  targetPostTitle,
  onSubmit
}: ReportPostModalProps) {
  const [selectedReason, setSelectedReason] = useState<PostReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportReasons = [
    {
      value: PostReportReason.INAPPROPRIATE_CONTENT,
      label: '不適切なコンテンツ',
      placeholder: '不適切な内容の詳細を教えてください（100文字以内）'
    },
    {
      value: PostReportReason.COPYRIGHT_VIOLATION,
      label: '著作権侵害',
      placeholder: '著作権侵害の詳細について教えてください（100文字以内）'
    },
    {
      value: PostReportReason.SPAM,
      label: 'スパム',
      placeholder: 'スパム行為の詳細を教えてください（100文字以内）'
    },
    {
      value: PostReportReason.MISLEADING_INFO,
      label: '誤解を招く情報',
      placeholder: '誤解を招く情報の詳細について教えてください（100文字以内）'
    },
    {
      value: PostReportReason.OTHER,
      label: 'その他',
      placeholder: '問題の詳細について教えてください（100文字以内）'
    }
  ];

  const handleReasonSelect = (reason: PostReportReason) => {
    setSelectedReason(reason);
    setDescription('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReason) {
      setError('通報理由を選択してください。');
      return;
    }

    if (!description.trim()) {
      setError('詳細を入力してください。');
      return;
    }

    if (description.length > 100) {
      setError('詳細は100文字以内で入力してください。');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        targetPostId,
        reason: selectedReason,
        description: description.trim()
      });
      
      // 成功時はリセット
      setSelectedReason(null);
      setDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '通報の送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason(null);
      setDescription('');
      setError(null);
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Flag size={20} className="text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">作品を通報</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="閉じる"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 説明 */}
        <p className="text-gray-600 mb-6">
          「{targetPostTitle}」を通報する理由を選択してください
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 通報理由選択 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              通報理由 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {reportReasons.map((reason) => (
                <button
                  key={reason.value}
                  type="button"
                  onClick={() => handleReasonSelect(reason.value)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedReason === reason.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </div>

          {/* 詳細入力 */}
          {selectedReason && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                詳細 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={reportReasons.find(r => r.value === selectedReason)?.placeholder}
                maxLength={100}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              />
              <div className="text-xs text-gray-500 text-right">
                {description.length}/100文字
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ボタン */}
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!selectedReason || !description.trim() || isSubmitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '送信中...' : '通報する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Portal を使用してbodyに直接レンダリング
  return typeof window !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
}