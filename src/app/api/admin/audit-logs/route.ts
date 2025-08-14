import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { authenticateAdmin } from '@/lib/adminAuth';

// 監査ログ取得
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateAdmin(request);
    if (!user) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const url = new URL(request.url);
    const filters = {
      action: url.searchParams.get('action'),
      adminId: url.searchParams.get('adminId'),
      targetId: url.searchParams.get('targetId'),
      dateFrom: url.searchParams.get('dateFrom'),
      dateTo: url.searchParams.get('dateTo'),
      searchQuery: url.searchParams.get('search'),
      limitCount: parseInt(url.searchParams.get('limit') || '100', 10)
    };

    // 基本クエリ（最新順）
    let auditQuery = query(
      collection(db, 'adminAuditLogs'),
      orderBy('timestamp', 'desc'),
      limit(filters.limitCount)
    );

    // フィルター適用
    if (filters.action) {
      auditQuery = query(auditQuery, where('action', '==', filters.action));
    }

    if (filters.adminId) {
      auditQuery = query(auditQuery, where('adminId', '==', filters.adminId));
    }

    if (filters.targetId) {
      auditQuery = query(auditQuery, where('targetId', '==', filters.targetId));
    }

    // 日付範囲フィルター
    if (filters.dateFrom || filters.dateTo) {
      const fromDate = filters.dateFrom ? Timestamp.fromDate(new Date(filters.dateFrom)) : null;
      const toDate = filters.dateTo ? Timestamp.fromDate(new Date(filters.dateTo + 'T23:59:59.999Z')) : null;

      if (fromDate && toDate) {
        auditQuery = query(auditQuery, where('timestamp', '>=', fromDate), where('timestamp', '<=', toDate));
      } else if (fromDate) {
        auditQuery = query(auditQuery, where('timestamp', '>=', fromDate));
      } else if (toDate) {
        auditQuery = query(auditQuery, where('timestamp', '<=', toDate));
      }
    }

    const snapshot = await getDocs(auditQuery);
    let logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // クライアントサイドでの検索フィルタリング
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      logs = logs.filter(log => 
        (log.adminEmail || '').toLowerCase().includes(searchLower) ||
        (log.action || '').toLowerCase().includes(searchLower) ||
        (log.targetId || '').toLowerCase().includes(searchLower) ||
        JSON.stringify(log.details || {}).toLowerCase().includes(searchLower)
      );
    }

    // 統計情報を計算
    const stats = calculateAuditStats(logs);

    return NextResponse.json({
      logs: logs.slice(0, 100), // 最大100件に制限
      stats,
      total: logs.length
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json(
      { error: '監査ログの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 監査ログ統計情報を計算
function calculateAuditStats(logs: Record<string, unknown>[]) {
  const total = logs.length;
  const byAction: Record<string, number> = {};
  const byAdmin: Record<string, number> = {};
  const byDate: Record<string, number> = {};

  logs.forEach((log: Record<string, unknown>) => {
    // アクション別集計
    byAction[log.action] = (byAction[log.action] || 0) + 1;

    // 管理者別集計
    byAdmin[log.adminEmail] = (byAdmin[log.adminEmail] || 0) + 1;

    // 日付別集計
    if (log.timestamp) {
      const date = log.timestamp.toDate ? 
        log.timestamp.toDate().toISOString().split('T')[0] :
        new Date(log.timestamp.seconds * 1000).toISOString().split('T')[0];
      byDate[date] = (byDate[date] || 0) + 1;
    }
  });

  // 最も活発な管理者
  const mostActiveAdmin = Object.entries(byAdmin).reduce(
    (max, [admin, count]) => count > max.count ? { admin, count } : max,
    { admin: '', count: 0 }
  );

  // 最も多いアクション
  const mostCommonAction = Object.entries(byAction).reduce(
    (max, [action, count]) => count > max.count ? { action, count } : max,
    { action: '', count: 0 }
  );

  return {
    total,
    byAction,
    byAdmin,
    byDate,
    mostActiveAdmin,
    mostCommonAction,
    dateRange: {
      earliest: logs.length > 0 ? logs[logs.length - 1]?.timestamp : null,
      latest: logs.length > 0 ? logs[0]?.timestamp : null
    }
  };
}