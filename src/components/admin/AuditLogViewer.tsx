'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  Clock, 
  User, 
  Shield, 
  AlertTriangle, 
  Search,
  Filter,
  Calendar,
  Download,
  Eye,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId: string;
  details: any;
  timestamp: any;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLogViewerProps {
  reportId?: string;
  className?: string;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ 
  reportId, 
  className = '' 
}) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    action: '',
    adminId: '',
    dateFrom: '',
    dateTo: '',
    searchQuery: ''
  });

  // 監査ログを取得
  const fetchAuditLogs = async () => {
    try {
      if (!user) return;
      
      setLoading(true);
      const token = await user.getIdToken();
      
      // クエリパラメータを構築
      const params = new URLSearchParams();
      if (reportId) params.append('targetId', reportId);
      if (filters.action) params.append('action', filters.action);
      if (filters.adminId) params.append('adminId', filters.adminId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.searchQuery) params.append('search', filters.searchQuery);
      
      const response = await fetch(`/api/admin/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAuditLogs();
    }
  }, [user, filters, reportId]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('ja-JP') + ' ' + date.toLocaleTimeString('ja-JP');
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'process_report':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'user_action':
        return <User className="w-4 h-4 text-orange-600" />;
      case 'content_moderation':
        return <Eye className="w-4 h-4 text-green-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'process_report':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'user_action':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'content_moderation':
        return 'bg-green-50 text-green-800 border-green-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'process_report': '通報処理',
      'user_action': 'ユーザーアクション',
      'content_moderation': 'コンテンツ管理',
      'system_action': 'システム処理'
    };
    return labels[action] || action;
  };

  const exportLogs = () => {
    const csvContent = [
      ['日時', '管理者', 'アクション', '対象ID', 'IPアドレス', 'ユーザーエージェント'],
      ...logs.map(log => [
        formatDate(log.timestamp),
        log.adminEmail,
        getActionLabel(log.action),
        log.targetId,
        log.ipAddress || '',
        log.userAgent || ''
      ])
    ].map(row => row.join(',')).join('\\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">監査ログを読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-red-200 shadow-sm ${className}`}>
        <div className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">エラー</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAuditLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {/* ヘッダー */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-lg p-2">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">監査ログ</h3>
              <p className="text-sm text-gray-600">
                管理者の操作履歴 ({logs.length}件)
              </p>
            </div>
          </div>
          <button
            onClick={exportLogs}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            CSV出力
          </button>
        </div>

        {/* フィルター（reportIdが指定されていない場合のみ表示） */}
        {!reportId && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="管理者、アクション、対象IDで検索..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select
                value={filters.action}
                onChange={(e) => setFilters({...filters, action: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全アクション</option>
                <option value="process_report">通報処理</option>
                <option value="user_action">ユーザーアクション</option>
                <option value="content_moderation">コンテンツ管理</option>
              </select>
              
              <input
                type="text"
                placeholder="管理者ID"
                value={filters.adminId}
                onChange={(e) => setFilters({...filters, adminId: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* ログリスト */}
      <div className="max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">監査ログはありません</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getActionIcon(log.action)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {log.adminEmail}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        対象: {log.targetId} • {formatDate(log.timestamp)}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  >
                    詳細
                    {expandedLog === log.id ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* 展開可能な詳細情報 */}
                {expandedLog === log.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                    {log.ipAddress && (
                      <div className="text-sm">
                        <span className="text-gray-500">IPアドレス:</span>
                        <span className="ml-2 font-mono text-gray-900">{log.ipAddress}</span>
                      </div>
                    )}
                    
                    {log.userAgent && (
                      <div className="text-sm">
                        <span className="text-gray-500">ユーザーエージェント:</span>
                        <span className="ml-2 text-gray-900 break-all">{log.userAgent}</span>
                      </div>
                    )}
                    
                    {log.details && (
                      <div className="text-sm">
                        <span className="text-gray-500 block mb-2">処理詳細:</span>
                        <div className="bg-gray-50 rounded-lg p-3 border">
                          <pre className="text-xs text-gray-900 whitespace-pre-wrap font-mono">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};