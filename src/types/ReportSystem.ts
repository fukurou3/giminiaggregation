/**
 * Professional Report Management System - Type Definitions
 * 
 * 統合通報管理システムの型定義
 */

import { Timestamp } from 'firebase/firestore';

// ========================================
// Core Enums
// ========================================

export enum ReportType {
  USER = 'user',
  POST = 'post', 
  COMMENT = 'comment',
  MESSAGE = 'message',
  PROFILE = 'profile'
}

export enum ReportStatus {
  PENDING = 'pending',           // 未処理
  REVIEWING = 'reviewing',       // 確認中
  INVESTIGATING = 'investigating', // 調査中
  ESCALATED = 'escalated',       // エスカレート済み
  RESOLVED = 'resolved',         // 解決済み
  DISMISSED = 'dismissed',       // 却下
  DUPLICATE = 'duplicate'        // 重複
}

export enum ReportPriority {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ActionType {
  NO_ACTION = 'no_action',
  WARNING = 'warning',
  CONTENT_HIDE = 'content_hide',
  ACCOUNT_SUSPEND = 'account_suspend',
  ACCOUNT_BAN = 'account_ban',
  CONTENT_DELETE = 'content_delete',
  ESCALATE = 'escalate'
}

export enum ReportCategory {
  SPAM = 'spam',
  HARASSMENT = 'harassment', 
  HATE_SPEECH = 'hate_speech',
  VIOLENCE = 'violence',
  ADULT_CONTENT = 'adult_content',
  COPYRIGHT = 'copyright',
  PRIVACY = 'privacy',
  MISINFORMATION = 'misinformation',
  OTHER = 'other'
}

// ========================================
// Core Data Models
// ========================================

export interface UnifiedReport {
  // 基本情報
  id: string;
  reportType: ReportType;
  category: ReportCategory;
  
  // 通報者情報
  reporterId: string;
  reporterDetails?: {
    email?: string;
    username?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  
  // 対象情報  
  targetId: string; // ユーザーID or コンテンツID
  targetType: 'user' | 'content';
  targetUserId: string; // 対象ユーザーのID
  targetDetails?: {
    username?: string;
    email?: string;
    contentTitle?: string;
    contentUrl?: string;
  };
  
  // 通報内容
  reason: string;
  description: string;
  evidence?: ReportEvidence[];
  
  // 状態管理
  status: ReportStatus;
  priority: ReportPriority;
  tags: string[];
  
  // 処理情報
  assignedTo?: string; // 担当管理者ID
  processedBy?: string; // 処理完了管理者ID
  processingNotes?: string;
  internalNotes?: string; // 内部メモ
  
  // アクション情報
  actionTaken?: ActionType;
  actionDetails?: any;
  actionDate?: Timestamp;
  
  // 関連情報
  relatedReports?: string[]; // 関連通報ID
  duplicateOf?: string; // 重複元通報ID
  escalatedFrom?: string; // エスカレート元通報ID
  
  // SLA管理
  slaDeadline?: Timestamp;
  responseTime?: number; // 初回対応時間(分)
  resolutionTime?: number; // 解決時間(分)
  
  // システム情報
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
  
  // メタデータ
  source: 'web' | 'mobile' | 'api';
  version: number; // データバージョン
  archived?: boolean;
}

export interface ReportEvidence {
  id: string;
  type: 'screenshot' | 'url' | 'text' | 'file';
  data: string;
  description?: string;
  addedAt: Timestamp;
  addedBy: string;
}

// ========================================
// Action & Workflow Types
// ========================================

export interface ReportAction {
  id: string;
  reportId: string;
  type: ActionType;
  performedBy: string;
  performedAt: Timestamp;
  
  // アクション詳細
  details: {
    reason?: string;
    duration?: number; // 停止期間（日数）
    template?: string; // 使用テンプレート
    customMessage?: string;
    notifyUser?: boolean;
    notifyReporter?: boolean;
    escalateTo?: string; // エスカレート先
  };
  
  // 結果
  result?: {
    success: boolean;
    error?: string;
    notificationsSent?: number;
    affectedContent?: string[];
  };
}

export interface ActionTemplate {
  id: string;
  name: string;
  type: ActionType;
  category: ReportCategory[];
  
  // テンプレート設定
  config: {
    userNotificationTemplate?: string;
    reporterNotificationTemplate?: string;
    processingNotes?: string;
    defaultDuration?: number; // 停止期間など
    requiresApproval?: boolean;
  };
  
  createdBy: string;
  createdAt: Timestamp;
  isActive: boolean;
}

// ========================================
// Filter & Search Types  
// ========================================

export interface ReportFilters {
  status?: ReportStatus[];
  priority?: ReportPriority[];
  category?: ReportCategory[];
  type?: ReportType[];
  assignedTo?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  tags?: string[];
  searchQuery?: string;
  overdue?: boolean; // SLA期限切れ
}

export interface ReportSortOptions {
  field: 'createdAt' | 'priority' | 'status' | 'slaDeadline';
  direction: 'asc' | 'desc';
}

// ========================================
// Analytics & Reporting
// ========================================

export interface ReportAnalytics {
  // 基本統計
  totalReports: number;
  byStatus: Record<ReportStatus, number>;
  byPriority: Record<ReportPriority, number>;
  byCategory: Record<ReportCategory, number>;
  byType: Record<ReportType, number>;
  
  // パフォーマンス指標
  averageResponseTime: number; // 分
  averageResolutionTime: number; // 分
  slaCompliance: number; // %
  overdueReports: number;
  
  // トレンド
  dailyVolume: Array<{date: string, count: number}>;
  weeklyTrends: Array<{week: string, resolved: number, created: number}>;
  
  // 管理者パフォーマンス
  adminStats: Array<{
    adminId: string;
    resolved: number;
    averageTime: number;
    compliance: number;
  }>;
}

// ========================================
// UI State Management
// ========================================

export interface ReportListState {
  reports: UnifiedReport[];
  selectedReports: string[];
  filters: ReportFilters;
  sorting: ReportSortOptions;
  loading: boolean;
  error?: string;
  
  // Pagination
  currentPage: number;
  pageSize: number;
  totalCount: number;
  
  // UI状態
  viewMode: 'list' | 'cards' | 'table';
  showFilters: boolean;
  selectedReport?: UnifiedReport;
}

export interface BulkActionRequest {
  reportIds: string[];
  action: ActionType;
  reason?: string;
  assignTo?: string;
  template?: string;
}

// ========================================
// API Response Types
// ========================================

export interface ReportListResponse {
  reports: UnifiedReport[];
  total: number;
  page: number;
  pageSize: number;
  analytics?: ReportAnalytics;
}

export interface ReportActionResponse {
  success: boolean;
  reportId: string;
  actionId: string;
  message?: string;
  error?: string;
}

export interface BulkActionResponse {
  success: boolean;
  processed: number;
  failed: number;
  results: Array<{
    reportId: string;
    success: boolean;
    error?: string;
  }>;
}