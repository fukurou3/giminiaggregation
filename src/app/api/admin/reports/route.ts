import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  doc, 
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { authenticateAdmin } from '@/lib/adminAuth';

// 統合レポート型
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
  adminAction?: string; // 実行されたアクション
  processedBy?: string; // 処理した管理者
  targetContentId?: string;
  targetContentType?: 'post' | 'comment' | 'profile';
  reportType: 'user' | 'post';
}

interface ReportFilters {
  status?: string[];
  priority?: string[];
  searchQuery?: string;
}

interface ReportStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  avgResolutionTime: number;
  pendingOldest: any;
}

// 通報一覧取得
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/admin/reports - Starting...');
    
    const user = await authenticateAdmin(request);
    if (!user) {
      console.log('GET /api/admin/reports - Admin authentication failed');
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }
    
    console.log('GET /api/admin/reports - Admin authenticated:', user.uid);

    const url = new URL(request.url);
    const filters: ReportFilters = {
      status: url.searchParams.get('status')?.split(',') || undefined,
      priority: url.searchParams.get('priority')?.split(',') || undefined,
      searchQuery: url.searchParams.get('search') || undefined,
    };

    // userReportsとpostReportsの両方から取得
    console.log('GET /api/admin/reports - Creating queries...');
    
    const userReportsQuery = query(
      collection(db, 'userReports'),
      orderBy('createdAt', 'desc')
    );
    
    const postReportsQuery = query(
      collection(db, 'postReports'),
      orderBy('createdAt', 'desc')
    );

    console.log('GET /api/admin/reports - Fetching reports from Firestore...');
    
    // 各コレクションから取得（エラーハンドリング付き）
    const [userSnapshot, postSnapshot] = await Promise.all([
      getDocs(userReportsQuery).catch(err => {
        console.log('userReports collection error:', err);
        return { docs: [] };
      }),
      getDocs(postReportsQuery).catch(err => {
        console.log('postReports collection might not exist yet:', err);
        return { docs: [] };
      })
    ]);
    
    console.log('GET /api/admin/reports - Fetched userReports:', userSnapshot.docs.length);
    console.log('GET /api/admin/reports - Fetched postReports:', postSnapshot.docs.length);

    // userReportsを変換
    const userReports: UnifiedReport[] = userSnapshot.docs.map(userDoc => ({
      id: userDoc.id,
      reportType: 'user' as const,
      ...userDoc.data(),
      adminAction: userDoc.data().adminAction,
      processedBy: userDoc.data().processedBy
    })) as UnifiedReport[];

    // postReportsを変換（targetUserIdをauthorIdから取得）
    const postReports: UnifiedReport[] = await Promise.all(
      postSnapshot.docs.map(async (reportDoc) => {
        const reportData = reportDoc.data();
        
        // 投稿の作成者IDを取得
        const postRef = doc(db, 'posts', reportData.targetPostId);
        const postDoc = await getDoc(postRef);
        const targetUserId = postDoc.exists() ? postDoc.data().authorId : 'unknown';
        
        return {
          id: reportDoc.id,
          reportType: 'post' as const,
          reporterId: reportData.reporterId,
          targetUserId: targetUserId,
          reason: reportData.reason,
          description: reportData.description,
          status: reportData.status,
          createdAt: reportData.createdAt,
          updatedAt: reportData.updatedAt,
          adminNotes: reportData.adminNotes,
          adminAction: reportData.adminAction,
          processedBy: reportData.processedBy,
          targetContentId: reportData.targetPostId,
          targetContentType: 'post' as const
        } as UnifiedReport;
      })
    );

    // 統合してソート
    let reports = [...userReports, ...postReports].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    // ステータスフィルター適用
    if (filters.status && filters.status.length > 0) {
      reports = reports.filter(report => filters.status!.includes(report.status));
    }

    // クライアントサイドフィルタリング
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      reports = reports.filter(report => 
        report.description.toLowerCase().includes(searchLower) ||
        report.reason.toLowerCase().includes(searchLower) ||
        report.targetUserId.toLowerCase().includes(searchLower) ||
        report.reporterId.toLowerCase().includes(searchLower)
      );
    }

    // 統計情報を計算
    const stats = calculateReportStats(reports);

    return NextResponse.json({
      reports: reports.slice(0, 100),
      stats,
      total: reports.length
    });

  } catch (error) {
    console.error('Get admin reports error:', error);
    return NextResponse.json(
      { 
        error: '通報一覧の取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// 通報処理実行
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateAdmin(request);
    if (!user) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const processRequest = await request.json();
    
    // 処理メモの必須チェック
    if (!processRequest.processingNotes || !processRequest.processingNotes.trim()) {
      return NextResponse.json({ error: '処理メモは必須です' }, { status: 400 });
    }
    
    // 通報ドキュメントを取得（userReportsまたはpostReportsから）
    let reportRef = doc(db, 'userReports', processRequest.reportId);
    let reportSnap = await getDoc(reportRef);
    let reportType: 'user' | 'post' = 'user';
    
    // userReportsで見つからない場合、postReportsから検索
    if (!reportSnap.exists()) {
      reportRef = doc(db, 'postReports', processRequest.reportId);
      reportSnap = await getDoc(reportRef);
      reportType = 'post';
    }
    
    if (!reportSnap.exists()) {
      return NextResponse.json({ error: '通報が見つかりません' }, { status: 404 });
    }

    const now = serverTimestamp();
    const batch = writeBatch(db);

    // 通報ステータス更新
    batch.update(reportRef, {
      status: '対応済み',
      updatedAt: now,
      adminNotes: processRequest.processingNotes || '',
      adminAction: processRequest.action,
      processedBy: user.email || user.uid
    });

    // AdminActionに基づく実際の処理を実行
    await executeAdminAction(processRequest, batch, now, reportType);

    // 処理ログを記録（監査用）
    const auditLogRef = doc(collection(db, 'adminAuditLogs'));
    batch.set(auditLogRef, {
      adminId: user.uid,
      adminEmail: user.email,
      action: 'process_report',
      reportId: processRequest.reportId,
      adminAction: processRequest.action,
      details: processRequest,
      timestamp: now,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent')
    });

    // バッチコミット
    await batch.commit();

    // 通知送信（通報者・対象ユーザー）
    if (processRequest.notifyReporter && processRequest.messageToReporter) {
      await addDoc(collection(db, 'userNotifications'), {
        userId: reportSnap.data()?.reporterId,
        title: '通報処理完了のお知らせ',
        message: processRequest.messageToReporter,
        type: 'system',
        read: false,
        createdAt: now
      });
    }

    if (processRequest.notifyTarget && processRequest.messageToTarget) {
      await addDoc(collection(db, 'userNotifications'), {
        userId: reportSnap.data()?.targetUserId,
        title: '運営からの通知',
        message: processRequest.messageToTarget,
        type: 'warning',
        read: false,
        createdAt: now
      });
    }

    return NextResponse.json({
      success: true,
      message: '通報処理が完了しました'
    });

  } catch (error) {
    console.error('Process report error:', error);
    return NextResponse.json(
      { error: '通報処理に失敗しました' },
      { status: 500 }
    );
  }
}

// 統計情報を計算
function calculateReportStats(reports: UnifiedReport[]): ReportStats {
  const total = reports.length;
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  
  let totalResolutionTime = 0;
  let resolvedCount = 0;
  let oldestPending: any = null;

  reports.forEach(report => {
    byStatus[report.status] = (byStatus[report.status] || 0) + 1;
    byType[report.reason] = (byType[report.reason] || 0) + 1;
    
    // 解決済みの場合、解決時間を計算
    if (report.status === '対応済み' && report.updatedAt && report.createdAt) {
      const resolutionTime = report.updatedAt.toMillis() - report.createdAt.toMillis();
      totalResolutionTime += resolutionTime;
      resolvedCount++;
    }

    // 最古の未処理通報を追跡
    if (report.status === '未処理' && 
        (!oldestPending || report.createdAt.toMillis() < oldestPending.toMillis())) {
      oldestPending = report.createdAt;
    }
  });

  return {
    total,
    byStatus,
    byType,
    byPriority,
    avgResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount / (1000 * 60) : 0,
    pendingOldest: oldestPending
  };
}

// 通知テンプレート定義
const NOTIFICATION_TEMPLATES = {
  content_hide: {
    title: 'コンテンツが非表示になりました',
    message: 'あなたの投稿が利用規約に違反するため非表示にいたしました。今後は利用規約をご確認の上、適切なコンテンツの投稿をお願いいたします。'
  },
  user_warning: {
    title: '利用規約違反に関する警告',
    message: 'あなたの行為が利用規約に違反することが確認されました。今後同様の行為が続いた場合、アカウントの利用停止等の処置を講じる場合があります。利用規約をご確認の上、適切にご利用ください。'
  },
  user_ban_permanent: {
    title: 'アカウント永久停止のお知らせ',
    message: '重大かつ継続的な利用規約違反により、あなたのアカウントを永久停止いたします。今後サービスをご利用いただくことはできません。'
  }
};

// 管理者アクションを実行
async function executeAdminAction(
  processRequest: any, 
  batch: any, 
  timestamp: any,
  reportType: 'user' | 'post'
) {
  const { action, targetContentId, targetContentType, targetUserId } = processRequest;
  
  switch (action) {
    case 'content_hide':
      if (reportType === 'post' && targetContentId) {
        // 投稿を非表示にする
        const postRef = doc(db, 'posts', targetContentId);
        batch.update(postRef, {
          isHidden: true,
          hiddenAt: timestamp,
          hiddenReason: 'admin_action'
        });
        
        // 対象ユーザーに通知
        if (targetUserId) {
          const notificationRef = doc(collection(db, 'userNotifications'));
          const template = NOTIFICATION_TEMPLATES.content_hide;
          batch.set(notificationRef, {
            userId: targetUserId,
            title: template.title,
            message: template.message,
            type: 'warning',
            read: false,
            createdAt: timestamp
          });
        }
      }
      break;
      
    case 'user_warning':
      if (targetUserId) {
        // ユーザーに警告を送信
        const notificationRef = doc(collection(db, 'userNotifications'));
        const template = NOTIFICATION_TEMPLATES.user_warning;
        batch.set(notificationRef, {
          userId: targetUserId,
          title: template.title,
          message: template.message,
          type: 'warning',
          read: false,
          createdAt: timestamp
        });
      }
      break;
      
    case 'user_ban_permanent':
      if (targetUserId) {
        // ユーザーを永久停止
        const userRef = doc(db, 'users', targetUserId);
        batch.update(userRef, {
          isBanned: true,
          bannedAt: timestamp,
          bannedReason: 'admin_action'
        });
        
        // 対象ユーザーに通知
        const notificationRef = doc(collection(db, 'userNotifications'));
        const template = NOTIFICATION_TEMPLATES.user_ban_permanent;
        batch.set(notificationRef, {
          userId: targetUserId,
          title: template.title,
          message: template.message,
          type: 'error',
          read: false,
          createdAt: timestamp
        });
      }
      break;
      
    case 'no_action':
    default:
      // 何もしない
      break;
  }
}
