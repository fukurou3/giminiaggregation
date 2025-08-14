export enum PostReportReason {
  INAPPROPRIATE_CONTENT = '不適切なコンテンツ',
  COPYRIGHT_VIOLATION = '著作権侵害',
  SPAM = 'スパム',
  MISLEADING_INFO = '誤解を招く情報',
  OTHER = 'その他'
}

export enum PostReportStatus {
  PENDING = '未処理',
  IN_REVIEW = '確認中',
  RESOLVED = '対応済み',
  REJECTED = '却下'
}

export interface PostReport {
  id: string;
  reporterId: string;
  targetPostId: string;
  reason: PostReportReason;
  description: string;
  createdAt: string;
  status: PostReportStatus;
  adminNotes?: string;
  updatedAt?: string;
}

export interface CreatePostReportRequest {
  targetPostId: string;
  reason: PostReportReason;
  description: string;
}

export interface UpdatePostReportRequest {
  status: PostReportStatus;
  adminNotes?: string;
}