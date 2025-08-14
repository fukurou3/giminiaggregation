/**
 * Professional Report Service - Data Access Layer
 * 
 * 統合通報管理システムのデータアクセス層
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  writeBatch,
  serverTimestamp,
  Timestamp,
  updateDoc,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  UnifiedReport, 
  ReportFilters, 
  ReportSortOptions,
  ReportStatus,
  ReportPriority,
  ActionType,
  ReportAction,
  ReportAnalytics,
  BulkActionRequest,
  ReportListResponse,
  ReportActionResponse,
  BulkActionResponse
} from '@/types/ReportSystem';

// ========================================
// Constants & Configuration
// ========================================

const COLLECTIONS = {
  REPORTS: 'unifiedReports',
  ACTIONS: 'reportActions', 
  TEMPLATES: 'actionTemplates',
  AUDIT_LOGS: 'reportAuditLogs'
} as const;

const SLA_DEADLINES = {
  critical: 2 * 60, // 2時間
  high: 24 * 60,    // 24時間  
  medium: 72 * 60,  // 3日
  low: 168 * 60     // 7日
} as const;

// ========================================
// Core Report Service
// ========================================

export class ReportService {
  
  /**
   * 通報一覧取得（高度なフィルタリング・ページング対応）
   */
  static async getReports(
    filters: ReportFilters = {},
    sorting: ReportSortOptions = { field: 'createdAt', direction: 'desc' },
    page: number = 1,
    pageSize: number = 25
  ): Promise<ReportListResponse> {
    
    try {
      let q = collection(db, COLLECTIONS.REPORTS);
      
      // フィルター適用
      if (filters.status?.length) {
        q = query(q, where('status', 'in', filters.status));
      }
      
      if (filters.priority?.length) {
        q = query(q, where('priority', 'in', filters.priority));
      }
      
      if (filters.category?.length) {
        q = query(q, where('category', 'in', filters.category));
      }
      
      if (filters.assignedTo?.length) {
        q = query(q, where('assignedTo', 'in', filters.assignedTo));
      }
      
      if (filters.tags?.length) {
        q = query(q, where('tags', 'array-contains-any', filters.tags));
      }
      
      if (filters.overdue) {
        q = query(q, where('slaDeadline', '<', Timestamp.now()));
      }
      
      if (filters.dateRange) {
        const { from, to } = filters.dateRange;
        q = query(
          q, 
          where('createdAt', '>=', Timestamp.fromDate(from)),
          where('createdAt', '<=', Timestamp.fromDate(to))
        );
      }
      
      // ソート適用
      q = query(q, orderBy(sorting.field, sorting.direction));
      
      // ページング適用
      const offset = (page - 1) * pageSize;
      if (offset > 0) {
        // 実装は簡略化 - 実際にはcursorベースページングが望ましい
        q = query(q, limit(pageSize));
      } else {
        q = query(q, limit(pageSize));
      }
      
      const snapshot = await getDocs(q);
      const reports: UnifiedReport[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UnifiedReport[];
      
      // 総件数取得（簡略化）
      const totalCount = reports.length; // 実際には別途カウントクエリが必要
      
      return {
        reports,
        total: totalCount,
        page,
        pageSize
      };
      
    } catch (error) {
      console.error('Failed to get reports:', error);
      throw new Error('通報一覧の取得に失敗しました');
    }
  }
  
  /**
   * 通報詳細取得
   */
  static async getReportById(reportId: string): Promise<UnifiedReport | null> {
    try {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      const snapshot = await getDoc(docRef);
      
      if (!snapshot.exists()) {
        return null;
      }
      
      return {
        id: snapshot.id,
        ...snapshot.data()
      } as UnifiedReport;
      
    } catch (error) {
      console.error('Failed to get report:', error);
      throw new Error('通報詳細の取得に失敗しました');
    }
  }
  
  /**
   * 通報作成
   */
  static async createReport(reportData: Partial<UnifiedReport>): Promise<string> {
    try {
      const now = serverTimestamp();
      
      // SLA期限自動計算
      const priority = reportData.priority || ReportPriority.MEDIUM;
      const slaMinutes = SLA_DEADLINES[priority];
      const slaDeadline = Timestamp.fromMillis(
        Date.now() + (slaMinutes * 60 * 1000)
      );
      
      const report: Partial<UnifiedReport> = {
        ...reportData,
        status: ReportStatus.PENDING,
        priority,
        slaDeadline,
        tags: reportData.tags || [],
        version: 1,
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(collection(db, COLLECTIONS.REPORTS), report);
      
      // 作成ログ
      await this.logAction({
        reportId: docRef.id,
        type: ActionType.NO_ACTION,
        performedBy: 'system',
        performedAt: now,
        details: { reason: 'Report created' }
      });
      
      return docRef.id;
      
    } catch (error) {
      console.error('Failed to create report:', error);
      throw new Error('通報の作成に失敗しました');
    }
  }
  
  /**
   * 通報更新
   */
  static async updateReport(
    reportId: string, 
    updates: Partial<UnifiedReport>,
    performedBy: string
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        version: (updates.version || 1) + 1
      };
      
      await updateDoc(docRef, updateData);
      
      // 更新ログ
      await this.logAction({
        reportId,
        type: ActionType.NO_ACTION,
        performedBy,
        performedAt: serverTimestamp(),
        details: { reason: 'Report updated', changes: Object.keys(updates) }
      });
      
    } catch (error) {
      console.error('Failed to update report:', error);
      throw new Error('通報の更新に失敗しました');
    }
  }
  
  /**
   * 通報アクション実行
   */
  static async executeAction(
    reportId: string,
    actionType: ActionType,
    performedBy: string,
    details: any = {}
  ): Promise<ReportActionResponse> {
    
    const batch = writeBatch(db);
    
    try {
      // 通報取得
      const report = await this.getReportById(reportId);
      if (!report) {
        throw new Error('通報が見つかりません');
      }
      
      const now = serverTimestamp();
      
      // 通報ステータス更新
      const reportRef = doc(db, COLLECTIONS.REPORTS, reportId);
      const newStatus = this.getStatusFromAction(actionType);
      
      batch.update(reportRef, {
        status: newStatus,
        actionTaken: actionType,
        actionDate: now,
        processedBy: performedBy,
        updatedAt: now,
        ...(newStatus === ReportStatus.RESOLVED && { resolvedAt: now })
      });
      
      // アクション記録
      const actionRef = doc(collection(db, COLLECTIONS.ACTIONS));
      const action: ReportAction = {
        id: actionRef.id,
        reportId,
        type: actionType,
        performedBy,
        performedAt: now,
        details
      };
      
      batch.set(actionRef, action);
      
      // 実際のアクション実行
      await this.performAction(actionType, report, details, batch);
      
      await batch.commit();
      
      return {
        success: true,
        reportId,
        actionId: actionRef.id,
        message: 'アクションが正常に実行されました'
      };
      
    } catch (error) {
      console.error('Failed to execute action:', error);
      return {
        success: false,
        reportId,
        actionId: '',
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }
  
  /**
   * バルクアクション実行
   */
  static async executeBulkAction(
    bulkRequest: BulkActionRequest,
    performedBy: string
  ): Promise<BulkActionResponse> {
    
    const results = [];
    let processed = 0;
    let failed = 0;
    
    for (const reportId of bulkRequest.reportIds) {
      try {
        const result = await this.executeAction(
          reportId,
          bulkRequest.action,
          performedBy,
          {
            reason: bulkRequest.reason,
            template: bulkRequest.template
          }
        );
        
        results.push({
          reportId,
          success: result.success,
          error: result.error
        });
        
        if (result.success) {
          processed++;
        } else {
          failed++;
        }
        
      } catch (error) {
        results.push({
          reportId,
          success: false,
          error: error instanceof Error ? error.message : '不明なエラー'
        });
        failed++;
      }
    }
    
    return {
      success: failed === 0,
      processed,
      failed,
      results
    };
  }
  
  /**
   * 分析データ取得
   */
  static async getAnalytics(
    dateRange?: { from: Date; to: Date }
  ): Promise<ReportAnalytics> {
    
    try {
      // 簡略化された実装 - 実際にはより複雑な集計が必要
      const reportsSnapshot = await getDocs(collection(db, COLLECTIONS.REPORTS));
      const reports = reportsSnapshot.docs.map(doc => doc.data()) as UnifiedReport[];
      
      // 基本統計
      const totalReports = reports.length;
      const byStatus = reports.reduce((acc, report) => {
        acc[report.status] = (acc[report.status] || 0) + 1;
        return acc;
      }, {} as Record<ReportStatus, number>);
      
      const byPriority = reports.reduce((acc, report) => {
        acc[report.priority] = (acc[report.priority] || 0) + 1;
        return acc;
      }, {} as Record<ReportPriority, number>);
      
      // パフォーマンス指標（簡略化）
      const resolvedReports = reports.filter(r => r.status === ReportStatus.RESOLVED);
      const averageResolutionTime = resolvedReports.length > 0 
        ? resolvedReports.reduce((acc, report) => acc + (report.resolutionTime || 0), 0) / resolvedReports.length
        : 0;
      
      const overdueReports = reports.filter(r => 
        r.slaDeadline && r.slaDeadline.toMillis() < Date.now() && 
        r.status !== ReportStatus.RESOLVED
      ).length;
      
      return {
        totalReports,
        byStatus,
        byPriority,
        byCategory: {} as any, // 実装省略
        byType: {} as any,
        averageResponseTime: 0, // 実装省略
        averageResolutionTime,
        slaCompliance: 0, // 実装省略
        overdueReports,
        dailyVolume: [], // 実装省略
        weeklyTrends: [], // 実装省略
        adminStats: [] // 実装省略
      };
      
    } catch (error) {
      console.error('Failed to get analytics:', error);
      throw new Error('分析データの取得に失敗しました');
    }
  }
  
  // ========================================
  // Private Helper Methods
  // ========================================
  
  private static getStatusFromAction(action: ActionType): ReportStatus {
    switch (action) {
      case ActionType.NO_ACTION:
        return ReportStatus.DISMISSED;
      case ActionType.ESCALATE:
        return ReportStatus.ESCALATED;
      default:
        return ReportStatus.RESOLVED;
    }
  }
  
  private static async performAction(
    actionType: ActionType,
    report: UnifiedReport,
    details: any,
    batch: any
  ): Promise<void> {
    
    switch (actionType) {
      case ActionType.WARNING:
        await this.sendUserNotification(report.targetUserId, {
          title: '利用規約違反に関する警告',
          message: details.customMessage || 'あなたの行為が利用規約に違反しています。',
          type: 'warning'
        });
        break;
        
      case ActionType.CONTENT_HIDE:
        if (report.reportType === 'post') {
          const contentRef = doc(db, 'posts', report.targetId);
          batch.update(contentRef, {
            isHidden: true,
            hiddenAt: serverTimestamp(),
            hiddenReason: details.reason
          });
        }
        break;
        
      case ActionType.ACCOUNT_SUSPEND:
        const userRef = doc(db, 'users', report.targetUserId);
        const suspendUntil = new Date();
        suspendUntil.setDate(suspendUntil.getDate() + (details.duration || 7));
        
        batch.update(userRef, {
          isSuspended: true,
          suspendedUntil: Timestamp.fromDate(suspendUntil),
          suspendedReason: details.reason
        });
        break;
        
      case ActionType.ACCOUNT_BAN:
        const banUserRef = doc(db, 'users', report.targetUserId);
        batch.update(banUserRef, {
          isBanned: true,
          bannedAt: serverTimestamp(),
          bannedReason: details.reason
        });
        break;
    }
  }
  
  private static async sendUserNotification(
    userId: string, 
    notification: { title: string; message: string; type: string }
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'userNotifications'), {
        userId,
        ...notification,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }
  
  private static async logAction(action: Partial<ReportAction>): Promise<void> {
    try {
      await addDoc(collection(db, COLLECTIONS.ACTIONS), {
        ...action,
        performedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  }
}