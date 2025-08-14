'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { UserReportReason, CreateUserReportRequest } from '@/types/UserReport';

interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUsername: string;
  onSubmit: (reportData: CreateUserReportRequest) => Promise<void>;
}

export function ReportUserModal({
  isOpen,
  onClose,
  targetUserId,
  targetUsername,
  onSubmit
}: ReportUserModalProps) {
  const [selectedReason, setSelectedReason] = useState<UserReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportReasons = [
    {
      value: UserReportReason.HARASSMENT,
      label: '嫌がらせ・攻撃的な行動',
      placeholder: '具体的な行動やコメントについて教えてください（100文字以内）'
    },
    {
      value: UserReportReason.SPAM,
      label: 'スパム',
      placeholder: 'スパム行為の詳細を教えてください（100文字以内）'
    },
    {
      value: UserReportReason.IMPERSONATION,
      label: 'なりすまし',
      placeholder: 'なりすましの詳細について教えてください（100文字以内）'
    },
    {
      value: UserReportReason.OTHER,
      label: 'その他',
      placeholder: '問題の詳細について教えてください（100文字以内）'
    }
  ];

  const handleReasonSelect = (reason: UserReportReason) => {
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
        targetUserId,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">ユーザーを通報</h3>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 説明 */}
        <p className="text-muted-foreground mb-6">
          「{targetUsername}」を通報する理由を選択してください
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 通報理由選択 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
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
                      ? 'border-primary bg-primary/10'
                      : 'border-input hover:bg-muted'
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
              <label className="block text-sm font-medium text-foreground">
                詳細 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={reportReasons.find(r => r.value === selectedReason)?.placeholder}
                maxLength={100}
                rows={4}
                className="w-full px-3 py-2 border border-input rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSubmitting}
              />
              <div className="text-xs text-muted-foreground text-right">
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
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
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
}