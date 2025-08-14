'use client';

import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  type: 'reporter' | 'target' | 'both';
}

interface ReportMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reporterId: string;
  targetUserId: string;
  onSendMessage: (data: {
    recipientType: 'reporter' | 'target' | 'both';
    title: string;
    message: string;
  }) => Promise<void>;
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'reporter_received',
    title: '通報を受理いたしました',
    content: `この度は通報をいただき、ありがとうございます。

運営チームにて内容を確認し、適切な対応を行わせていただきます。
調査には数日お時間をいただく場合がございますが、何卒ご理解のほどお願いいたします。

今後ともより良いコミュニティ運営にご協力いただき、ありがとうございます。`,
    type: 'reporter'
  },
  {
    id: 'reporter_no_violation',
    title: '通報の調査結果について',
    content: `この度はご報告いただき、ありがとうございました。

運営チームにて調査を行った結果、該当の内容についてはコミュニティガイドライン違反には該当しないと判断いたします。
ただし、今後も適切なコミュニティ運営のため、引き続きご協力をお願いいたします。

ご不明な点がございましたら、お気軽にお問い合わせください。`,
    type: 'reporter'
  },
  {
    id: 'target_warning',
    title: 'コミュニティガイドラインについて',
    content: `いつもサービスをご利用いただき、ありがとうございます。

この度、あなたの投稿や行動について通報をいただき、運営チームにて確認を行いました。
今回の内容はコミュニティガイドラインに抵触する可能性があります。

今後はガイドラインを遵守の上、適切な利用をお願いいたします。
詳細についてご不明な点がございましたら、お問い合わせください。`,
    type: 'target'
  },
  {
    id: 'target_violation',
    title: 'コミュニティガイドライン違反について',
    content: `いつもサービスをご利用いただき、ありがとうございます。

この度、あなたの投稿や行動について通報をいただき、運営チームにて確認を行った結果、コミュニティガイドライン違反と判断いたします。

今回は警告とさせていただきますが、今後同様の行為が確認された場合、アカウントの利用制限等の措置を取らせていただく場合があります。

コミュニティガイドラインを遵守の上、適切な利用をお願いいたします。`,
    type: 'target'
  }
];

export function ReportMessageModal({
  isOpen,
  onClose,
  reportId,
  reporterId,
  targetUserId,
  onSendMessage
}: ReportMessageModalProps) {
  const [recipientType, setRecipientType] = useState<'reporter' | 'target' | 'both'>('reporter');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTemplateSelect = (templateId: string) => {
    const template = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setTitle(template.title);
      setMessage(template.content);
      setRecipientType(template.type);
      setSelectedTemplate(templateId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      setError('タイトルとメッセージを入力してください。');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSendMessage({
        recipientType,
        title: title.trim(),
        message: message.trim()
      });
      
      // 成功時はリセット
      setTitle('');
      setMessage('');
      setSelectedTemplate('');
      setRecipientType('reporter');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メッセージの送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setMessage('');
      setSelectedTemplate('');
      setRecipientType('reporter');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  const filteredTemplates = MESSAGE_TEMPLATES.filter(template => 
    recipientType === 'both' || template.type === recipientType || template.type === 'both'
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">運営メッセージ送信</h3>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 送信先選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              送信先 <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRecipientType('reporter')}
                className={`px-3 py-2 text-sm rounded border transition-colors ${
                  recipientType === 'reporter'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                通報者のみ
              </button>
              <button
                type="button"
                onClick={() => setRecipientType('target')}
                className={`px-3 py-2 text-sm rounded border transition-colors ${
                  recipientType === 'target'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                通報対象者のみ
              </button>
              <button
                type="button"
                onClick={() => setRecipientType('both')}
                className={`px-3 py-2 text-sm rounded border transition-colors ${
                  recipientType === 'both'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                両方
              </button>
            </div>
          </div>

          {/* テンプレート選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              テンプレート選択（任意）
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">カスタムメッセージ</option>
              {filteredTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
          </div>

          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="メッセージのタイトルを入力"
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {title.length}/100文字
            </div>
          </div>

          {/* メッセージ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              メッセージ <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="メッセージ内容を入力"
              maxLength={1000}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {message.length}/1000文字
            </div>
          </div>

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
              disabled={!title.trim() || !message.trim() || isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? '送信中...' : 'メッセージ送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}