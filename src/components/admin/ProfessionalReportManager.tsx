/**
 * Professional Report Management Interface
 * 
 * プロレベルの通報管理インターフェース
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  Search, 
  Filter, 
  RefreshCw,
  CheckSquare,
  Square,
  MoreVertical,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Flag,
  Eye,
  MessageSquare,
  Shield,
  Ban,
  UserX,
  FileText,
  BarChart3,
  Settings,
  Download,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { 
  UnifiedReport,
  ReportFilters, 
  ReportSortOptions,
  ReportStatus,
  ReportPriority,
  ActionType,
  ReportCategory,
  ReportListResponse
} from '@/types/ReportSystem';
import { ReportService } from '@/lib/reports/reportService';

// ========================================
// Main Component
// ========================================

export default function ProfessionalReportManager() {
  const { user, isAdmin } = useAuth();
  
  // State Management
  const [reports, setReports] = useState<UnifiedReport[]>([]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [sorting, setSorting] = useState<ReportSortOptions>({ 
    field: 'createdAt', 
    direction: 'desc' 
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Constants
  const PAGE_SIZE = 25;
  
  // Data Fetching
  const fetchReports = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Use API endpoint instead of direct service call
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: PAGE_SIZE.toString(),
        sortField: sorting.field,
        sortDirection: sorting.direction,
        includeAnalytics: 'true'
      });
      
      // Add filters to params
      if (filters.status?.length) params.set('status', filters.status.join(','));
      if (filters.priority?.length) params.set('priority', filters.priority.join(','));
      if (filters.searchQuery) params.set('search', filters.searchQuery);
      
      if (!user) throw new Error('No user');
      
      const token = await user.getIdToken();
      const apiResponse = await fetch(`/api/admin/unified-reports?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!apiResponse.ok) {
        throw new Error('API request failed');
      }
      
      const response: ReportListResponse = await apiResponse.json();
      
      setReports(response.reports);
      setTotalCount(response.total);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '通報一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [filters, sorting, currentPage, isAdmin]);
  
  // Effects
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);
  
  // Selection Management
  const toggleSelectAll = useCallback(() => {
    if (selectedReports.length === reports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(reports.map(r => r.id));
    }
  }, [selectedReports.length, reports]);
  
  const toggleSelectReport = useCallback((reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  }, []);
  
  // Bulk Actions
  const executeBulkAction = useCallback(async (action: ActionType) => {
    if (selectedReports.length === 0) return;
    
    try {
      setLoading(true);
      
      // Use API endpoint for bulk action
      const token = await user.getIdToken();
      const apiResponse = await fetch('/api/admin/unified-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'bulk',
          reportIds: selectedReports,
          action,
          details: { reason: `Bulk ${action} action` }
        })
      });
      
      if (!apiResponse.ok) {
        throw new Error('Bulk action API request failed');
      }
      
      const result = await apiResponse.json();
      
      if (result.success) {
        setSelectedReports([]);
        await fetchReports();
      }
      
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedReports, user?.uid, fetchReports]);
  
  // Computed Values
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasSelection = selectedReports.length > 0;
  const allSelected = selectedReports.length === reports.length && reports.length > 0;
  
  // Event Handlers
  const handleSortChange = useCallback((field: string) => {
    setSorting(prev => ({
      field: field as any,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  }, []);
  
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  
  const handleFilterChange = useCallback((newFilters: Partial<ReportFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  }, []);
  
  // Render Helper Functions
  const getStatusIcon = (status: ReportStatus) => {
    const iconMap = {
      [ReportStatus.PENDING]: <Clock className="w-4 h-4 text-yellow-600" />,
      [ReportStatus.REVIEWING]: <Eye className="w-4 h-4 text-blue-600" />,
      [ReportStatus.INVESTIGATING]: <Search className="w-4 h-4 text-purple-600" />,
      [ReportStatus.ESCALATED]: <AlertTriangle className="w-4 h-4 text-orange-600" />,
      [ReportStatus.RESOLVED]: <CheckCircle className="w-4 h-4 text-green-600" />,
      [ReportStatus.DISMISSED]: <XCircle className="w-4 h-4 text-red-600" />,
      [ReportStatus.DUPLICATE]: <Flag className="w-4 h-4 text-gray-600" />
    };
    return iconMap[status];
  };
  
  const getPriorityBadge = (priority: ReportPriority) => {
    const variants = {
      [ReportPriority.CRITICAL]: 'bg-red-100 text-red-800 border-red-300',
      [ReportPriority.HIGH]: 'bg-orange-100 text-orange-800 border-orange-300',
      [ReportPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      [ReportPriority.LOW]: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${variants[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">アクセス拒否</h2>
          <p className="text-gray-600">管理者権限が必要です</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">通報管理システム</h1>
                <p className="text-sm text-gray-600">Professional Report Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  showFilters 
                    ? 'bg-blue-50 text-blue-700 border-blue-300' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4 mr-2 inline" />
                フィルター
              </button>
              
              <button
                onClick={fetchReports}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 inline ${loading ? 'animate-spin' : ''}`} />
                更新
              </button>
            </div>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <span className="text-gray-600">
                総件数: <span className="font-semibold">{totalCount}</span>
              </span>
              <span className="text-gray-600">
                選択中: <span className="font-semibold">{selectedReports.length}</span>
              </span>
              <span className="text-gray-600">
                ページ: <span className="font-semibold">{currentPage}/{totalPages}</span>
              </span>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <ReportFiltersPanel 
            filters={filters}
            onFiltersChange={handleFilterChange}
          />
        </div>
      )}
      
      {/* Bulk Actions Bar */}
      {hasSelection && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedReports.length}件選択中
            </span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => executeBulkAction(ActionType.WARNING)}
                className="px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 rounded hover:bg-orange-200"
              >
                一括警告
              </button>
              <button
                onClick={() => executeBulkAction(ActionType.NO_ACTION)}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                一括却下
              </button>
              <button
                onClick={() => setSelectedReports([])}
                className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
              >
                選択解除
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="px-6 py-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {viewMode === 'table' ? (
          <ReportTable 
            reports={reports}
            selectedReports={selectedReports}
            allSelected={allSelected}
            loading={loading}
            sorting={sorting}
            onSelectAll={toggleSelectAll}
            onSelectReport={toggleSelectReport}
            onSortChange={handleSortChange}
            onReportAction={async (reportId, action) => {
              await ReportService.executeAction(reportId, action, user?.uid || '', {});
              await fetchReports();
            }}
          />
        ) : (
          <ReportCards 
            reports={reports}
            selectedReports={selectedReports}
            onSelectReport={toggleSelectReport}
          />
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalCount)} - {Math.min(currentPage * PAGE_SIZE, totalCount)} / {totalCount} 件
            </p>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, currentPage - 2) + i;
                if (page > totalPages) return null;
                
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm rounded-lg ${
                      page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// Sub-components
// ========================================

interface ReportFiltersPanelProps {
  filters: ReportFilters;
  onFiltersChange: (filters: Partial<ReportFilters>) => void;
}

function ReportFiltersPanel({ filters, onFiltersChange }: ReportFiltersPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
        <select
          value={filters.status?.[0] || ''}
          onChange={(e) => onFiltersChange({ 
            status: e.target.value ? [e.target.value as ReportStatus] : undefined 
          })}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">すべて</option>
          <option value={ReportStatus.PENDING}>未処理</option>
          <option value={ReportStatus.REVIEWING}>確認中</option>
          <option value={ReportStatus.RESOLVED}>解決済み</option>
          <option value={ReportStatus.DISMISSED}>却下</option>
        </select>
      </div>
      
      {/* Priority Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
        <select
          value={filters.priority?.[0] || ''}
          onChange={(e) => onFiltersChange({ 
            priority: e.target.value ? [e.target.value as ReportPriority] : undefined 
          })}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">すべて</option>
          <option value={ReportPriority.CRITICAL}>緊急</option>
          <option value={ReportPriority.HIGH}>高</option>
          <option value={ReportPriority.MEDIUM}>中</option>
          <option value={ReportPriority.LOW}>低</option>
        </select>
      </div>
      
      {/* Search */}
      <div className="md:col-span-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">検索</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="通報内容、ユーザーIDで検索..."
            value={filters.searchQuery || ''}
            onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

interface ReportTableProps {
  reports: UnifiedReport[];
  selectedReports: string[];
  allSelected: boolean;
  loading: boolean;
  sorting: ReportSortOptions;
  onSelectAll: () => void;
  onSelectReport: (id: string) => void;
  onSortChange: (field: string) => void;
  onReportAction: (reportId: string, action: ActionType) => void;
}

function ReportTable({
  reports,
  selectedReports,
  allSelected,
  loading,
  sorting,
  onSelectAll,
  onSelectReport,
  onSortChange,
  onReportAction
}: ReportTableProps) {
  
  const getStatusIcon = (status: ReportStatus) => {
    const iconMap = {
      [ReportStatus.PENDING]: <Clock className="w-4 h-4 text-yellow-600" />,
      [ReportStatus.REVIEWING]: <Eye className="w-4 h-4 text-blue-600" />,
      [ReportStatus.INVESTIGATING]: <Search className="w-4 h-4 text-purple-600" />,
      [ReportStatus.ESCALATED]: <AlertTriangle className="w-4 h-4 text-orange-600" />,
      [ReportStatus.RESOLVED]: <CheckCircle className="w-4 h-4 text-green-600" />,
      [ReportStatus.DISMISSED]: <XCircle className="w-4 h-4 text-red-600" />,
      [ReportStatus.DUPLICATE]: <Flag className="w-4 h-4 text-gray-600" />
    };
    return iconMap[status];
  };
  
  const getPriorityBadge = (priority: ReportPriority) => {
    const variants = {
      [ReportPriority.CRITICAL]: 'bg-red-100 text-red-800',
      [ReportPriority.HIGH]: 'bg-orange-100 text-orange-800',
      [ReportPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800',
      [ReportPriority.LOW]: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${variants[priority]}`}>
        {priority.charAt(0).toUpperCase()}
      </span>
    );
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-12 px-4 py-3">
                <button onClick={onSelectAll} className="flex items-center justify-center">
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </th>
              
              <th className="px-4 py-3 text-left">
                <button 
                  onClick={() => onSortChange('priority')}
                  className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase hover:text-gray-700"
                >
                  優先度
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              
              <th className="px-4 py-3 text-left">
                <button 
                  onClick={() => onSortChange('status')}
                  className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase hover:text-gray-700"
                >
                  ステータス
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-gray-500 uppercase">内容</span>
              </th>
              
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-gray-500 uppercase">対象</span>
              </th>
              
              <th className="px-4 py-3 text-left">
                <button 
                  onClick={() => onSortChange('createdAt')}
                  className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase hover:text-gray-700"
                >
                  作成日時
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              
              <th className="w-16 px-4 py-3">
                <span className="text-xs font-medium text-gray-500 uppercase">操作</span>
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200">
            {loading && reports.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-500">読み込み中...</p>
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-gray-500">通報がありません</p>
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr 
                  key={report.id}
                  className={`hover:bg-gray-50 ${selectedReports.includes(report.id) ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => onSelectReport(report.id)}
                      className="flex items-center justify-center"
                    >
                      {selectedReports.includes(report.id) ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </td>
                  
                  <td className="px-4 py-3">
                    {getPriorityBadge(report.priority)}
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(report.status)}
                      <span className="text-sm text-gray-900">{report.status}</span>
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{report.reason}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">
                        {report.description}
                      </p>
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <p className="text-gray-900">{report.targetUserId.slice(0, 8)}...</p>
                      <p className="text-xs text-gray-500">{report.reportType}</p>
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">
                      {report.createdAt?.toDate?.()?.toLocaleDateString('ja-JP') || '-'}
                    </span>
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button 
                        className="p-1 text-gray-400 hover:text-gray-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Show action menu
                        }}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ReportCardsProps {
  reports: UnifiedReport[];
  selectedReports: string[];
  onSelectReport: (id: string) => void;
}

function ReportCards({ reports, selectedReports, onSelectReport }: ReportCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {reports.map((report) => (
        <div 
          key={report.id}
          className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
            selectedReports.includes(report.id) ? 'ring-2 ring-blue-500' : 'border-gray-200'
          }`}
        >
          {/* Card content implementation */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onSelectReport(report.id)}
                className="flex items-center justify-center"
              >
                {selectedReports.includes(report.id) ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <span className="text-sm font-medium">{report.reason}</span>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              report.priority === ReportPriority.CRITICAL ? 'bg-red-100 text-red-800' :
              report.priority === ReportPriority.HIGH ? 'bg-orange-100 text-orange-800' :
              report.priority === ReportPriority.MEDIUM ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {report.priority}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {report.description}
          </p>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{report.reportType}</span>
            <span>{report.createdAt?.toDate?.()?.toLocaleDateString('ja-JP')}</span>
          </div>
        </div>
      ))}
    </div>
  );
}