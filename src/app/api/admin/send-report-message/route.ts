import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { authenticateAdmin } from '@/lib/adminAuth';

// 通報関連メッセージ送信
export async function POST(request: NextRequest) {
  try {
    // 管理者認証
    const { user } = await authenticateAdmin(request);
    if (!user) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      reportId,
      reporterId,
      targetUserId,
      recipientType,
      title,
      message
    } = body;

    if (!reportId || !reporterId || !targetUserId || !recipientType || !title || !message) {
      return NextResponse.json(
        { error: '必要な情報が不足しています' },
        { status: 400 }
      );
    }

    const notificationsRef = collection(db, 'userNotifications');
    const notifications = [];

    // 送信先に基づいてメッセージを作成
    if (recipientType === 'reporter' || recipientType === 'both') {
      // 通報者にメッセージ送信
      const reporterNotification = {
        userId: reporterId,
        type: 'report',
        title,
        message,
        read: false,
        createdAt: serverTimestamp(),
        metadata: {
          reportId,
          fromAdmin: true,
          adminId: user.uid
        }
      };
      
      const reporterDoc = await addDoc(notificationsRef, reporterNotification);
      notifications.push({ id: reporterDoc.id, recipient: 'reporter' });
    }

    if (recipientType === 'target' || recipientType === 'both') {
      // 通報対象者にメッセージ送信
      const targetNotification = {
        userId: targetUserId,
        type: 'report',
        title,
        message,
        read: false,
        createdAt: serverTimestamp(),
        metadata: {
          reportId,
          fromAdmin: true,
          adminId: user.uid
        }
      };
      
      const targetDoc = await addDoc(notificationsRef, targetNotification);
      notifications.push({ id: targetDoc.id, recipient: 'target' });
    }

    return NextResponse.json({
      success: true,
      message: 'メッセージを送信しました',
      notifications
    });

  } catch (error) {
    console.error('Send report message error:', error);
    return NextResponse.json(
      { error: 'メッセージの送信に失敗しました' },
      { status: 500 }
    );
  }
}