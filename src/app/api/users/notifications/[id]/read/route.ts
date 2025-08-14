import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { authenticateUser } from '@/app/api/_middleware/auth';

// 通知を既読にする
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    const { user } = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const notificationId = params.id;

    // 通知を既読に更新
    const notificationRef = doc(db, 'userNotifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp()
    });

    return NextResponse.json({
      success: true,
      message: '通知を既読にしました'
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    return NextResponse.json(
      { error: '既読更新に失敗しました' },
      { status: 500 }
    );
  }
}