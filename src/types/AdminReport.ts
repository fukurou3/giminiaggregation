import { Timestamp } from 'firebase/firestore';

// 基本の通報タイプ
export enum ReportType {
  POST = 'post',
  COMMENT = 'comment',
  PROFILE = 'profile',
  USER_BEHAVIOR = 'user_behavior'
}

// 通報理由（詳細分類）
export enum ReportReason {
  HARASSMENT = 'harassment',
  SPAM = 'spam',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  VIOLENCE_THREATS = 'violence_threats',
  HATE_SPEECH = 'hate_speech',
  IMPERSONATION = 'impersonation',
  PRIVACY_VIOLATION = 'privacy_violation',
  COPYRIGHT = 'copyright',
  SCAM_FRAUD = 'scam_fraud',
  OTHER = 'other'
}

// 通報ステータス
export enum ReportStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review', 
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated'
}

// アクション種別
export enum AdminAction {
  NO_ACTION = 'no_action',
  CONTENT_HIDE = 'content_hide',
  CONTENT_DELETE = 'content_delete',
  USER_WARNING = 'user_warning',
  USER_SUSPEND_1DAY = 'user_suspend_1day',
  USER_SUSPEND_3DAYS = 'user_suspend_3days',
  USER_SUSPEND_7DAYS = 'user_suspend_7days',
  USER_SUSPEND_30DAYS = 'user_suspend_30days',
  USER_BAN_PERMANENT = 'user_ban_permanent'
}

// 定型処理理由
export enum ProcessingReason {
  COMMUNITY_GUIDELINES_VIOLATION = 'community_guidelines_violation',
  SPAM_CONTENT = 'spam_content',
  HARASSMENT_CONFIRMED = 'harassment_confirmed',
  INAPPROPRIATE_CONTENT_CONFIRMED = 'inappropriate_content_confirmed',
  FALSE_REPORT = 'false_report',
  INSUFFICIENT_EVIDENCE = 'insufficient_evidence',
  DUPLICATE_REPORT = 'duplicate_report',
  RESOLVED_BY_USER = 'resolved_by_user',
  CUSTOM = 'custom'
}

// 拡張された通報データ
export interface AdminReport {
  id: string;
  reporterId: string;
  targetUserId: string;
  reportType: ReportType;
  reason: ReportReason;
  description: string;
  
  // 対象コンテンツ情報
  targetContentId?: string; // 投稿ID、コメントIDなど
  targetContentType?: 'post' | 'comment' | 'profile';
  targetContentSnapshot?: Record<string, any>; // 通報時のコンテンツスナップショット
  
  // 通報者・対象者の追加情報
  reporterInfo?: {
    username: string;
    email: string;
    reportHistoryCount: number;
  };
  targetUserInfo?: {
    username: string;
    email: string;
    registrationDate: Timestamp;
    previousViolationCount: number;
  };
  
  // ステータス管理
  status: ReportStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // タイムスタンプ
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  resolvedAt?: Timestamp;
  
  // 管理者処理情報
  assignedAdminId?: string;
  adminProcessing?: AdminProcessing;
  
  // 関連通報
  relatedReportIds?: string[];
  
  // 内部フラグ
  isEscalated: boolean;
  requiresReview: boolean;
}

// 管理者処理記録
export interface AdminProcessing {
  adminId: string;
  adminEmail: string;
  processedAt: Timestamp;
  
  // 処理内容
  action: AdminAction;
  processingReason: ProcessingReason;
  customReason?: string;
  
  // 参照した規約
  policyReferences?: string[]; // 規約条項番号
  
  // 通知設定
  notifyReporter: boolean;
  notifyTarget: boolean;
  
  // メッセージ
  messageToReporter?: string;
  messageToTarget?: string;
  
  // 関連処理
  relatedActions?: RelatedAction[];
  
  // 監査用
  ipAddress?: string;
  userAgent?: string;
  processingNotes?: string;
}

// 関連処理
export interface RelatedAction {
  type: 'content_moderation' | 'user_action' | 'notification';
  targetId: string;
  description: string;
  executedAt: Timestamp;
  success: boolean;
  errorMessage?: string;
}

// API リクエスト型
export interface ProcessReportRequest {
  reportId: string;
  action: AdminAction;
  processingReason: ProcessingReason;
  customReason?: string;
  policyReferences?: string[];
  notifyReporter?: boolean;
  notifyTarget?: boolean;
  messageToReporter?: string;
  messageToTarget?: string;
  processingNotes?: string;
}

// 統計情報
export interface ReportStats {
  total: number;
  byStatus: Record<ReportStatus, number>;
  byType: Record<ReportType, number>;
  byPriority: Record<'low' | 'medium' | 'high' | 'critical', number>;
  avgResolutionTime: number; // 平均解決時間（分）
  pendingOldest: Timestamp | null; // 最古の未処理通報
}

// 定型理由マスター
export interface ProcessingReasonMaster {
  id: ProcessingReason;
  label: string;
  description: string;
  defaultAction: AdminAction;
  requiresCustomReason: boolean;
  policyReferences: string[];
}

// フィルター・ソート条件
export interface ReportFilters {
  status?: ReportStatus[];
  type?: ReportType[];
  priority?: ('low' | 'medium' | 'high' | 'critical')[];
  assignedAdmin?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
}