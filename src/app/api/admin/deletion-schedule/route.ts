import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { authenticateUser } from '@/app/api/_middleware/auth';

/**
 * 削除予定ユーザーの一覧取得（管理者用）
 */
export async function GET(request: NextRequest) {
  try {
    // 管理者認証（実装済みの認証機能を使用）
    const { user } = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    // 管理者権限チェック（必要に応じて実装）
    // const isAdmin = await checkAdminPermission(user.uid);
    // if (!isAdmin) {
    //   return NextResponse.json(
    //     { error: '管理者権限が必要です' },
    //     { status: 403 }
    //   );
    // }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'scheduled'; // scheduled, completed, all
    const limitParam = searchParams.get('limit');
    const queryLimit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20;

    let deletionQuery;

    if (status === 'all') {
      deletionQuery = query(
        collection(db, 'deletionSchedule'),
        orderBy('softDeletedAt', 'desc'),
        limit(queryLimit)
      );
    } else {
      deletionQuery = query(
        collection(db, 'deletionSchedule'),
        where('status', '==', status),
        orderBy('softDeletedAt', 'desc'),
        limit(queryLimit)
      );
    }

    const snapshot = await getDocs(deletionQuery);
    
    const deletionRecords = snapshot.docs.map(doc => {
      const data = doc.data();
      const now = new Date();
      const scheduledDate = data.scheduledDeletionAt?.toDate ? data.scheduledDeletionAt.toDate() : new Date(data.scheduledDeletionAt);
      const daysUntilDeletion = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: doc.id,
        userId: data.userId,
        userEmail: data.userEmail,
        status: data.status,
        softDeletedAt: data.softDeletedAt?.toDate?.()?.toISOString() || data.softDeletedAt,
        scheduledDeletionAt: scheduledDate.toISOString(),
        completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt,
        daysUntilDeletion: status === 'scheduled' ? daysUntilDeletion : null,
        isOverdue: status === 'scheduled' && daysUntilDeletion < 0,
        deletionLogCount: data.deletionLog?.length || 0
      };
    });

    // 統計情報も追加
    const scheduledCount = await getDocs(query(
      collection(db, 'deletionSchedule'),
      where('status', '==', 'scheduled')
    ));

    const completedCount = await getDocs(query(
      collection(db, 'deletionSchedule'),
      where('status', '==', 'completed')
    ));

    // 本日削除予定のカウント
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayScheduled = await getDocs(query(
      collection(db, 'deletionSchedule'),
      where('status', '==', 'scheduled'),
      where('scheduledDeletionAt', '<=', today)
    ));

    return NextResponse.json({
      success: true,
      data: {
        records: deletionRecords,
        pagination: {
          total: deletionRecords.length,
          limit: queryLimit,
          hasMore: deletionRecords.length === queryLimit
        },
        statistics: {
          scheduled: scheduledCount.size,
          completed: completedCount.size,
          dueToday: todayScheduled.size
        }
      }
    });

  } catch (error) {
    console.error('Deletion schedule fetch error:', error);
    return NextResponse.json(
      { 
        error: '削除予定の取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * 削除予定のキャンセル（管理者用復旧機能）
 */
export async function PATCH(request: NextRequest) {
  try {
    // 管理者認証
    const { user } = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const { scheduleId, action } = await request.json();

    if (action === 'cancel') {
      // 削除予定をキャンセルして復旧（高度な機能として実装可能）
      // 実装は複雑になるため、必要に応じて後で追加
      return NextResponse.json({
        success: false,
        message: '復旧機能は現在実装されていません'
      });
    }

    return NextResponse.json(
      { error: '無効なアクションです' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Deletion schedule update error:', error);
    return NextResponse.json(
      { 
        error: '削除予定の更新中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}