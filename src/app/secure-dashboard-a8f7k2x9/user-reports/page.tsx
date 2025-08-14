'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Flag, Clock, CheckCircle, XCircle, MessageSquare, ArrowLeft, Users, Send } from 'lucide-react';
import { ReportMessageModal } from '@/components/admin/ReportMessageModal';
import { UserReport, UserReportStatus, UpdateUserReportRequest } from '@/types/UserReport';

export default function UserReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<UserReportStatus | 'all'>('all');
  const [relatedReports, setRelatedReports] = useState<UserReport[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'status' | 'reason'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // メッセージ送信
  const handleSendMessage = async (data: {
    recipientType: 'reporter' | 'target' | 'both';
    title: string;
    message: string;
  }) => {
    try {
      if (!user || !selectedReport) {
        throw new Error('認証が必要です');
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/admin/send-report-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportId: selectedReport.id,
          reporterId: selectedReport.reporterId,
          targetUserId: selectedReport.targetUserId,
          ...data
        }),
      });

      if (!response.ok) {
        throw new Error('メッセージの送信に失敗しました');
      }

      alert('メッセージを送信しました');
    } catch (err) {
      throw err;
    }
  };

  // 通報一覧を取得
  const fetchReports = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error('認証が必要です');
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/admin/user-reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('通報一覧の取得に失敗しました');
      }

      const data = await response.json();
      console.log('Received reports data:', data);
      setReports(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '通報一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 通報ステータスを更新
  const updateReportStatus = async (reportId: string, updateData: UpdateUserReportRequest) => {
    try {
      setUpdatingReportId(reportId);
      
      if (!user) {
        throw new Error('認証が必要です');
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/admin/user-reports', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportId,
          ...updateData
        }),
      });

      if (!response.ok) {
        throw new Error('ステータスの更新に失敗しました');
      }

      // ローカル状態を更新
      setReports(prev => 
        prev.map(report => 
          report.id === reportId 
            ? { ...report, ...updateData }
            : report
        )
      );

      if (selectedReport?.id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, ...updateData } : null);
      }

    } catch (err) {
      alert(err instanceof Error ? err.message : 'ステータスの更新に失敗しました');
    } finally {
      setUpdatingReportId(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  // 同じユーザーへの関連通報を取得
  const fetchRelatedReports = async (targetUserId: string) => {
    const related = reports.filter(report => 
      report.targetUserId === targetUserId && report.id !== selectedReport?.id
    );
    setRelatedReports(related);
  };

  // 通報が選択されたときに関連通報も取得
  const handleReportSelect = (report: UserReport) => {
    setSelectedReport(report);
    fetchRelatedReports(report.targetUserId);
  };

  // 検索とフィルタリング
  const filteredAndSortedReports = React.useMemo(() => {
    let filtered = reports.filter(report => {
      const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
      const matchesSearch = searchTerm === '' || 
        report.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.targetUserId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.reporterId.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });

    // ソート
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'createdAt':
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          comparison = aTime - bTime;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'reason':
          comparison = a.reason.localeCompare(b.reason);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [reports, statusFilter, searchTerm, sortBy, sortOrder]);

  // 統計情報
  const stats = React.useMemo(() => {
    const total = reports.length;
    const pending = reports.filter(r => r.status === UserReportStatus.PENDING).length;
    const inReview = reports.filter(r => r.status === UserReportStatus.IN_REVIEW).length;
    const resolved = reports.filter(r => r.status === UserReportStatus.RESOLVED).length;
    const rejected = reports.filter(r => r.status === UserReportStatus.REJECTED).length;
    
    return { total, pending, inReview, resolved, rejected };
  }, [reports]);

  const getStatusIcon = (status: UserReportStatus) => {
    switch (status) {
      case UserReportStatus.PENDING:
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case UserReportStatus.IN_REVIEW:
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case UserReportStatus.RESOLVED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case UserReportStatus.REJECTED:
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Flag className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: UserReportStatus) => {
    switch (status) {
      case UserReportStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case UserReportStatus.IN_REVIEW:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case UserReportStatus.RESOLVED:
        return 'bg-green-100 text-green-800 border-green-200';
      case UserReportStatus.REJECTED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLevel = (report: UserReport) => {
    const age = Date.now() - (report.createdAt?.seconds * 1000 || 0);
    const daysSinceReport = age / (1000 * 60 * 60 * 24);
    
    if (report.status === UserReportStatus.PENDING && daysSinceReport > 3) {
      return 'high';
    }
    if (report.status === UserReportStatus.IN_REVIEW && daysSinceReport > 7) {
      return 'medium';
    }
    return 'normal';
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    
    let date: Date;
    if (timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp && timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return '-';
    }
    
    if (isNaN(date.getTime())) {
      return '-';
    }
    
    return date.toLocaleDateString('ja-JP') + ' ' + date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return '-';
    
    let date: Date;
    if (timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp && timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      return '-';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffDays > 0) return `${diffDays}日前`;
    if (diffHours > 0) return `${diffHours}時間前`;
    if (diffMinutes > 0) return `${diffMinutes}分前`;
    return '今';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">通報データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4">
            <Flag className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">エラーが発生しました</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button 
            onClick={fetchReports}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 rounded-lg p-2">
                <Flag className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">通報管理システム</h1>
                <p className="text-sm text-gray-600">ユーザー通報の確認と対応管理</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">最終更新</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(new Date())}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 統計情報カード */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総通報数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <Flag className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">未処理</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="bg-yellow-100 rounded-lg p-3">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">確認中</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inReview}</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-3">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">対応済み</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </div>
              <div className="bg-green-100 rounded-lg p-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">却下</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <div className="bg-red-100 rounded-lg p-3">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* 通報一覧 */}
          <div className="col-span-12 lg:col-span-5">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              {/* 検索・フィルター */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    通報一覧 
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({filteredAndSortedReports.length}件)
                    </span>
                  </h2>
                </div>
                
                {/* 検索バー */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="通報者ID、対象ユーザーID、理由、説明で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* フィルターとソート */}
                <div className="flex flex-wrap gap-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as UserReportStatus | 'all')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">すべてのステータス</option>
                    <option value={UserReportStatus.PENDING}>未処理</option>
                    <option value={UserReportStatus.IN_REVIEW}>確認中</option>
                    <option value={UserReportStatus.RESOLVED}>対応済み</option>
                    <option value={UserReportStatus.REJECTED}>却下</option>
                  </select>
                  
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'status' | 'reason')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="createdAt">作成日時</option>
                    <option value="status">ステータス</option>
                    <option value="reason">理由</option>
                  </select>
                  
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {sortOrder === 'asc' ? '昇順' : '降順'}
                  </button>
                </div>
              </div>
              
              {/* 通報リスト */}
              <div className="max-h-[600px] overflow-y-auto">
                {filteredAndSortedReports.length === 0 ? (
                  <div className="p-8 text-center">
                    <Flag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">条件に一致する通報はありません</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredAndSortedReports.map((report) => {
                      const priority = getPriorityLevel(report);
                      return (
                        <div
                          key={report.id}
                          onClick={() => handleReportSelect(report)}
                          className={`p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                            selectedReport?.id === report.id
                              ? 'bg-blue-50 border-r-4 border-blue-500'
                              : ''
                          } ${
                            priority === 'high' ? 'border-l-4 border-red-500' :
                            priority === 'medium' ? 'border-l-4 border-yellow-500' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                {getStatusIcon(report.status)}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                                  {report.status}
                                </span>
                                {priority === 'high' && (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full border border-red-200">
                                    緊急
                                  </span>
                                )}
                              </div>
                              
                              <div className="mb-2">
                                <p className="font-medium text-sm text-gray-900 mb-1">
                                  {report.reason}
                                </p>
                                <p className="text-xs text-gray-600 line-clamp-2">
                                  {report.description}
                                </p>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                <div>
                                  <span className="font-medium">対象:</span>
                                  <span className="ml-1 truncate block">{report.targetUserId}</span>
                                </div>
                                <div>
                                  <span className="font-medium">通報者:</span>
                                  <span className="ml-1 truncate block">{report.reporterId}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-500">
                                  {getRelativeTime(report.createdAt)}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatDate(report.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 通報詳細 */}
          <div className="col-span-12 lg:col-span-7">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">通報詳細</h2>
                  {selectedReport && (
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      一覧に戻る
                    </button>
                  )}
                </div>
              </div>
              
              {selectedReport ? (
                <div className="p-6">
                  <div className="space-y-6">
                    {/* ステータスと基本情報 */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(selectedReport.status)}
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedReport.status)}`}>
                            {selectedReport.status}
                          </span>
                          {getPriorityLevel(selectedReport) === 'high' && (
                            <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full border border-red-200">
                              緊急対応が必要
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          ID: {selectedReport.id}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-3 border">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">通報者</label>
                          <p className="text-sm font-medium text-gray-900 mt-1 break-all">{selectedReport.reporterId}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">対象ユーザー</label>
                          <p className="text-sm font-medium text-gray-900 mt-1 break-all">{selectedReport.targetUserId}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">通報理由</label>
                          <p className="text-sm font-medium text-gray-900 mt-1">{selectedReport.reason}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">作成日時</label>
                          <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(selectedReport.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* 詳細説明 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">詳細説明</label>
                      <div className="bg-gray-50 rounded-lg p-4 border">
                        <p className="text-gray-900 whitespace-pre-wrap">{selectedReport.description}</p>
                      </div>
                    </div>

                    {/* 管理者メモ */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">管理者メモ</label>
                      <textarea
                        value={selectedReport.adminNotes || ''}
                        onChange={(e) => 
                          setSelectedReport(prev => 
                            prev ? { ...prev, adminNotes: e.target.value } : null
                          )
                        }
                        className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                        placeholder="対応状況や処理内容を記録してください..."
                      />
                    </div>

                    {/* 関連通報 */}
                    {relatedReports.length > 0 && (
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                          <Users className="w-4 h-4" />
                          同じユーザーへの他の通報 ({relatedReports.length}件)
                        </label>
                        <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg">
                          {relatedReports.map((relatedReport) => (
                            <div 
                              key={relatedReport.id}
                              className="p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b last:border-b-0"
                              onClick={() => handleReportSelect(relatedReport)}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900">{relatedReport.reason}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(relatedReport.status)}`}>
                                  {relatedReport.status}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 truncate">{relatedReport.description}</p>
                              <p className="text-xs text-gray-500 mt-1">{getRelativeTime(relatedReport.createdAt)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* アクションボタン */}
                    <div className="space-y-4 pt-4 border-t">
                      {/* メッセージ送信 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">コミュニケーション</label>
                        <button
                          onClick={() => setShowMessageModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          <Send className="w-4 h-4" />
                          メッセージ送信
                        </button>
                      </div>

                      {/* ステータス更新 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ステータス変更</label>
                        <div className="flex flex-wrap gap-2">
                          {Object.values(UserReportStatus).map((status) => (
                            <button
                              key={status}
                              onClick={() => 
                                updateReportStatus(selectedReport.id, {
                                  status,
                                  adminNotes: selectedReport.adminNotes
                                })
                              }
                              disabled={
                                selectedReport.status === status || 
                                updatingReportId === selectedReport.id
                              }
                              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                                selectedReport.status === status
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                              }`}
                            >
                              {updatingReportId === selectedReport.id ? '更新中...' : status}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 一括処理 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">一括処理（同一対象ユーザー）</label>
                        <div className="flex flex-wrap gap-2">
                          {Object.values(UserReportStatus).map((status) => (
                            <button
                              key={status}
                              onClick={() => {
                                if (window.confirm(`この対象ユーザーへの全ての通報（${relatedReports.length + 1}件）を「${status}」に更新しますか？`)) {
                                  const allRelatedReports = [selectedReport, ...relatedReports];
                                  allRelatedReports.forEach(report => {
                                    updateReportStatus(report.id, {
                                      status,
                                      adminNotes: selectedReport.adminNotes
                                    });
                                  });
                                }
                              }}
                              disabled={updatingReportId !== null}
                              className="px-4 py-2 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition-colors font-medium"
                            >
                              全て{status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4">
                    <MessageSquare className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">通報を選択してください</h3>
                  <p className="text-gray-600">左側の一覧から通報を選択すると、詳細情報と対応オプションが表示されます。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* メッセージ送信モーダル */}
      {selectedReport && (
        <ReportMessageModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          reportId={selectedReport.id}
          reporterId={selectedReport.reporterId}
          targetUserId={selectedReport.targetUserId}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
}