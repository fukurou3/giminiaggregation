import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { authenticateUser } from '@/app/api/_middleware/auth';
import { CreateUserReportRequest, UserReportStatus } from '@/types/UserReport';

export async function POST(
  request: NextRequest,
  { params }: { params: { uid: string } }
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

    const targetUserId = params.uid;
    
    // 自分自身を通報することはできない
    if (user.uid === targetUserId) {
      return NextResponse.json(
        { error: '自分自身を通報することはできません' },
        { status: 400 }
      );
    }

    // リクエストボディを解析
    const body: CreateUserReportRequest = await request.json();
    const { reason, description } = body;

    // バリデーション
    if (!reason) {
      return NextResponse.json(
        { error: '通報理由を選択してください' },
        { status: 400 }
      );
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { error: '詳細を入力してください' },
        { status: 400 }
      );
    }

    if (description.length > 100) {
      return NextResponse.json(
        { error: '詳細は100文字以内で入力してください' },
        { status: 400 }
      );
    }

    // 重複チェック（同じユーザーから同じ対象への24時間以内の通報）
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const reportsRef = collection(db, 'userReports');
    const duplicateQuery = query(
      reportsRef,
      where('reporterId', '==', user.uid),
      where('targetUserId', '==', targetUserId)
    );

    const duplicateSnapshot = await getDocs(duplicateQuery);
    const recentReports = duplicateSnapshot.docs.filter(doc => {
      const reportData = doc.data();
      const createdAt = reportData.createdAt?.toDate();
      return createdAt && createdAt > oneDayAgo;
    });

    if (recentReports.length > 0) {
      return NextResponse.json(
        { error: '24時間以内に同じユーザーへの通報が既に送信されています' },
        { status: 429 }
      );
    }

    // 通報データを作成
    const reportData = {
      reporterId: user.uid,
      targetUserId,
      reason,
      description: description.trim(),
      status: UserReportStatus.PENDING,
      createdAt: serverTimestamp(),
    };

    // Firestoreに保存
    const docRef = await addDoc(reportsRef, reportData);

    return NextResponse.json({
      success: true,
      reportId: docRef.id,
      message: '通報を受け付けました。ご報告いただきありがとうございます。'
    });

  } catch (error) {
    console.error('Report submission error:', error);
    
    return NextResponse.json(
      { error: '通報の送信に失敗しました。しばらくしてから再度お試しください。' },
      { status: 500 }
    );
  }
}