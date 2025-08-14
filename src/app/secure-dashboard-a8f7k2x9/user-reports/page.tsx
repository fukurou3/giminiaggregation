'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search,
  MessageSquare,
  Shield,
  AlertCircle,
  User,
  Eye,
  EyeOff,
  Trash2,
  Ban,
  UserX
} from 'lucide-react';

// 統合レポート構造
interface UnifiedReport {
  id: string;
  reporterId: string;
  targetUserId: string;
  reason: string;
  description: string;
  status: string;
  createdAt: any;
  updatedAt?: any;
  adminNotes?: string;
  targetContentId?: string;
  targetContentType?: 'post' | 'comment' | 'profile';
  reportType: 'user' | 'post';
}

interface ReportStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

interface ReportFilters {
  status?: string[];
  type?: string[];
  searchQuery?: string;
}

// アクション種別
enum AdminAction {
  NO_ACTION = 'no_action',
  CONTENT_HIDE = 'content_hide',
  CONTENT_DELETE = 'content_delete',
  USER_WARNING = 'user_warning',
  USER_SUSPEND_3DAYS = 'user_suspend_3days',
  USER_SUSPEND_7DAYS = 'user_suspend_7days',
  USER_SUSPEND_30DAYS = 'user_suspend_30days',
  USER_BAN_PERMANENT = 'user_ban_permanent'
}

export default function UserReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<UnifiedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<UnifiedReport | null>(null);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // フィルター状態
  const [filters, setFilters] = useState<ReportFilters>({
    status: [],
    type: [],
    searchQuery: ''
  });

  // アクションパネル状態
  const [selectedAction, setSelectedAction] = useState<AdminAction>(AdminAction.NO_ACTION);
  const [processingNotes, setProcessingNotes] = useState('');
  const [notifyReporter, setNotifyReporter] = useState(false);
  const [notifyTarget, setNotifyTarget] = useState(false);
  const [messageToReporter, setMessageToReporter] = useState('');
  const [messageToTarget, setMessageToTarget] = useState('');

  // 通報データを取得
  const fetchReports = async () => {
    try {
      if (!user) return;
      
      setLoading(true);
      const token = await user.getIdToken();
      
      // クエリパラメータを構築
      const params = new URLSearchParams();
      if (filters.status?.length) params.append('status', filters.status.join(','));
      if (filters.type?.length) params.append('type', filters.type.join(','));
      if (filters.searchQuery) params.append('search', filters.searchQuery);
      
      const response = await fetch(`/api/admin/reports?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error details:', errorData);
        throw new Error(errorData.error || 'Failed to fetch reports');
      }
      
      const data = await response.json();
      setReports(data.reports);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  // 通報処理を実行
  const processReport = async () => {
    if (!selectedReport || !user || selectedAction === AdminAction.NO_ACTION) return;
    
    try {
      setProcessing(true);
      const token = await user.getIdToken();
      
      const processRequest = {
        reportId: selectedReport.id,
        action: selectedAction,
        processingNotes,
        notifyReporter,
        notifyTarget,
        messageToReporter: notifyReporter ? messageToReporter : undefined,
        messageToTarget: notifyTarget ? messageToTarget : undefined,
        targetContentId: selectedReport.targetContentId,
        targetContentType: selectedReport.targetContentType,
        targetUserId: selectedReport.targetUserId
      };
      
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(processRequest)
      });
      
      if (!response.ok) throw new Error('Failed to process report');
      
      // 成功後にリストを更新
      await fetchReports();
      
      // フォームをリセット
      resetActionForm();
      
      alert('通報処理が完了しました');
    } catch (err) {
      alert(err instanceof Error ? err.message : '通報処理に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  // アクションフォームをリセット
  const resetActionForm = () => {
    setSelectedAction(AdminAction.NO_ACTION);
    setProcessingNotes('');
    setNotifyReporter(false);
    setNotifyTarget(false);
    setMessageToReporter('');
    setMessageToTarget('');
  };

  // コンポーネント初期化
  useEffect(() => {
    if (user) {
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters]);

  // 選択された通報が変更された時のリセット
  useEffect(() => {
    if (selectedReport) {
      resetActionForm();
    }
  }, [selectedReport]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '未処理': return <Clock className="w-4 h-4 text-yellow-600" />;
      case '確認中': return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case '対応済み': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case '却下': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '未処理': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case '確認中': return 'bg-blue-50 text-blue-800 border-blue-200';
      case '対応済み': return 'bg-green-50 text-green-800 border-green-200';
      case '却下': return 'bg-red-50 text-red-800 border-red-200';
      default: return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getActionIcon = (action: AdminAction) => {
    switch (action) {
      case AdminAction.CONTENT_HIDE: return <EyeOff className="w-4 h-4" />;
      case AdminAction.CONTENT_DELETE: return <Trash2 className="w-4 h-4" />;
      case AdminAction.USER_WARNING: return <AlertTriangle className="w-4 h-4" />;
      case AdminAction.USER_SUSPEND_3DAYS:
      case AdminAction.USER_SUSPEND_7DAYS:
      case AdminAction.USER_SUSPEND_30DAYS: return <UserX className="w-4 h-4" />;
      case AdminAction.USER_BAN_PERMANENT: return <Ban className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getActionLabel = (action: AdminAction): string => {
    const labels: Record<AdminAction, string> = {
      [AdminAction.NO_ACTION]: '対応なし',
      [AdminAction.CONTENT_HIDE]: 'コンテンツ非表示',
      [AdminAction.CONTENT_DELETE]: 'コンテンツ削除',
      [AdminAction.USER_WARNING]: 'ユーザー警告',
      [AdminAction.USER_SUSPEND_3DAYS]: '3日間停止',
      [AdminAction.USER_SUSPEND_7DAYS]: '7日間停止',
      [AdminAction.USER_SUSPEND_30DAYS]: '30日間停止',
      [AdminAction.USER_BAN_PERMANENT]: '永久停止'
    };
    return labels[action] || action;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('ja-JP') + ' ' + date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">エラーが発生しました</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button 
            onClick={fetchReports}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 rounded-lg p-2">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">通報管理システム</h1>
              <p className="text-sm text-gray-600">Report Management Dashboard</p>
            </div>
          </div>
          <button
            onClick={fetchReports}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            更新
          </button>
        </div>
      </div>

      {/* 統計サマリー */}
      {stats && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">総通報数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.byStatus['未処理'] || 0}</div>
              <div className="text-sm text-gray-600">未処理</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.byStatus['確認中'] || 0}</div>
              <div className="text-sm text-gray-600">確認中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.byStatus['対応済み'] || 0}</div>
              <div className="text-sm text-gray-600">対応済み</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.byStatus['却下'] || 0}</div>
              <div className="text-sm text-gray-600">却下</div>
            </div>
          </div>
        </div>
      )}

      {/* メイン3カラムレイアウト */}
      <div className="flex h-[calc(100vh-200px)]">
        
        {/* 左カラム: 通報リスト */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          
          {/* フィルター */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="通報内容、ユーザーIDで検索..."
                value={filters.searchQuery || ''}
                onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filters.status?.[0] || ''}
                onChange={(e) => setFilters({...filters, status: e.target.value ? [e.target.value] : []})}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全ステータス</option>
                <option value="未処理">未処理</option>
                <option value="確認中">確認中</option>
                <option value="対応済み">対応済み</option>
                <option value="却下">却下</option>
              </select>
              
              <select
                value={filters.type?.[0] || ''}
                onChange={(e) => setFilters({...filters, type: e.target.value ? [e.target.value] : []})}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全タイプ</option>
                <option value="投稿">投稿通報</option>
                <option value="ユーザー">ユーザー通報</option>
              </select>
            </div>
          </div>

          {/* 通報リスト */}
          <div className="flex-1 overflow-y-auto">
            {reports.map((report) => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedReport?.id === report.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(report.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                  </div>
                </div>
                
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm text-gray-900">{report.reason}</h3>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      report.reportType === 'post' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {report.reportType === 'post' ? '投稿' : 'ユーザー'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{report.description}</p>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatDate(report.createdAt)}</span>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{report.targetUserId.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 中央カラム: 通報詳細 */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          {selectedReport ? (
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                
                {/* ヘッダー情報 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">通報詳細</h2>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedReport.status)}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedReport.status)}`}>
                        {selectedReport.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-4">ID: {selectedReport.id}</div>
                </div>

                {/* 基本情報 */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">通報理由</label>
                      <div className="text-sm font-medium text-gray-900">{selectedReport.reason}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">作成日時</label>
                      <div className="text-sm text-gray-900">{formatDate(selectedReport.createdAt)}</div>
                    </div>
                  </div>
                </div>

                {/* 関係者情報 */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="block text-xs font-medium text-gray-500 mb-2">通報者</label>
                    <div className="text-sm font-medium text-gray-900">{selectedReport.reporterId}</div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="block text-xs font-medium text-gray-500 mb-2">対象ユーザー</label>
                    <div className="text-sm font-medium text-gray-900">{selectedReport.targetUserId}</div>
                  </div>
                </div>

                {/* 詳細説明 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">詳細説明</label>
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedReport.description}</p>
                  </div>
                </div>

                {/* コンテンツ情報 */}
                {selectedReport.targetContentId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">対象コンテンツ</label>
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <div className="text-xs text-gray-500 mb-2">
                        タイプ: {selectedReport.targetContentType} | ID: {selectedReport.targetContentId}
                      </div>
                      {selectedReport.reportType === 'post' && (
                        <a 
                          href={`/posts/${selectedReport.targetContentId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                        >
                          <Eye className="w-3 h-3" />
                          投稿を確認
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* 管理者メモ */}
                {selectedReport.adminNotes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">管理者メモ</label>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="text-sm text-green-900">
                        {selectedReport.adminNotes}
                      </div>
                      {selectedReport.updatedAt && (
                        <div className="text-xs text-green-700 mt-2">
                          更新日時: {formatDate(selectedReport.updatedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">通報を選択</h3>
                <p className="text-gray-600">左側のリストから通報を選択してください</p>
              </div>
            </div>
          )}
        </div>

        {/* 右カラム: アクションパネル */}
        <div className="w-1/3 bg-white flex flex-col">
          {selectedReport && selectedReport.status !== '対応済み' ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">処理アクション</h2>
              </div>

              {/* アクション選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">実行アクション</label>
                <div className="space-y-2">
                  {Object.values(AdminAction).map(action => (
                    <label key={action} className="flex items-center">
                      <input
                        type="radio"
                        value={action}
                        checked={selectedAction === action}
                        onChange={(e) => setSelectedAction(e.target.value as AdminAction)}
                        className="mr-3"
                      />
                      <div className="flex items-center gap-2">
                        {getActionIcon(action)}
                        <span className="text-sm">{getActionLabel(action)}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 処理メモ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">処理メモ</label>
                <textarea
                  value={processingNotes}
                  onChange={(e) => setProcessingNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="処理内容や判断根拠を記録..."
                />
              </div>

              {/* 通知設定 */}
              <div className="space-y-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notifyReporter}
                      onChange={(e) => setNotifyReporter(e.target.checked)}
                      className="mr-3"
                    />
                    <span className="text-sm font-medium text-gray-700">通報者に通知</span>
                  </label>
                  {notifyReporter && (
                    <textarea
                      value={messageToReporter}
                      onChange={(e) => setMessageToReporter(e.target.value)}
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="通報者へのメッセージ..."
                    />
                  )}
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notifyTarget}
                      onChange={(e) => setNotifyTarget(e.target.checked)}
                      className="mr-3"
                    />
                    <span className="text-sm font-medium text-gray-700">対象ユーザーに通知</span>
                  </label>
                  {notifyTarget && (
                    <textarea
                      value={messageToTarget}
                      onChange={(e) => setMessageToTarget(e.target.value)}
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="対象ユーザーへのメッセージ..."
                    />
                  )}
                </div>
              </div>

              {/* 実行ボタン */}
              <div className="pt-4 border-t">
                <button
                  onClick={processReport}
                  disabled={processing || selectedAction === AdminAction.NO_ACTION}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {processing ? '処理中...' : '処理を実行'}
                </button>
              </div>
            </div>
          ) : selectedReport && selectedReport.status === '対応済み' ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">処理完了</h3>
                <p className="text-gray-600 mb-4">この通報は既に処理されています</p>
                {selectedReport.adminNotes && (
                  <div className="text-left bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-sm text-green-900">
                      管理者メモ: {selectedReport.adminNotes}
                      {selectedReport.updatedAt && (
                        <div>処理日時: {formatDate(selectedReport.updatedAt)}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">通報を選択</h3>
                <p className="text-gray-600">処理対象の通報を選択してください</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}