export enum UserReportReason {
  HARASSMENT = '嫌がらせ・攻撃的な行動',
  SPAM = 'スパム',
  IMPERSONATION = 'なりすまし',
  OTHER = 'その他'
}

export enum UserReportStatus {
  PENDING = '未処理',
  IN_REVIEW = '確認中',
  RESOLVED = '対応済み',
  REJECTED = '却下'
}

export interface UserReport {
  id: string;
  reporterId: string;
  targetUserId: string;
  reason: UserReportReason;
  description: string;
  createdAt: { toDate?: () => Date; seconds?: number } | Date;
  status: UserReportStatus;
  adminNotes?: string;
  adminAction?: string; // 実行されたアクション
  processedBy?: string; // 処理した管理者
  updatedAt?: { toDate?: () => Date; seconds?: number } | Date;
}

export interface CreateUserReportRequest {
  targetUserId: string;
  reason: UserReportReason;
  description: string;
}

export interface UpdateUserReportRequest {
  status: UserReportStatus;
  adminNotes?: string;
}