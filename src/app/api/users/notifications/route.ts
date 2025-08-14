import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { authenticateUser } from '@/app/api/_middleware/auth';

// ユーザーの通知一覧取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user } = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    // ユーザー向けの通知を取得（作成日時の降順）
    const notificationsRef = collection(db, 'userNotifications');
    const notificationsQuery = query(
      notificationsRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(notificationsQuery);
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ notifications });

  } catch (error) {
    console.error('Get user notifications error:', error);
    return NextResponse.json(
      { error: '通知の取得に失敗しました' },
      { status: 500 }
    );
  }
}