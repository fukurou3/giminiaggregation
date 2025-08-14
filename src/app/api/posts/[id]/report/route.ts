import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { authenticateUser } from '@/app/api/_middleware/auth';
import { CreatePostReportRequest, PostReportStatus } from '@/types/PostReport';

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

    const targetPostId = params.id;
    
    // 投稿が存在するかチェック
    const postRef = doc(db, 'posts', targetPostId);
    const postSnapshot = await getDoc(postRef);
    
    if (!postSnapshot.exists()) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    const postData = postSnapshot.data();
    
    // 自分の投稿を通報することはできない
    if (user.uid === postData.authorId) {
      return NextResponse.json(
        { error: '自分の投稿を通報することはできません' },
        { status: 400 }
      );
    }

    // リクエストボディを解析
    const body: CreatePostReportRequest = await request.json();
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

    // 重複チェック（同じユーザーから同じ投稿への24時間以内の通報）
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const reportsRef = collection(db, 'postReports');
    const duplicateQuery = query(
      reportsRef,
      where('reporterId', '==', user.uid),
      where('targetPostId', '==', targetPostId)
    );

    const duplicateSnapshot = await getDocs(duplicateQuery);
    const recentReports = duplicateSnapshot.docs.filter(doc => {
      const reportData = doc.data();
      const createdAt = reportData.createdAt?.toDate();
      return createdAt && createdAt > oneDayAgo;
    });

    if (recentReports.length > 0) {
      return NextResponse.json(
        { error: '24時間以内に同じ投稿への通報が既に送信されています' },
        { status: 429 }
      );
    }

    // 通報データを作成
    const reportData = {
      reporterId: user.uid,
      targetPostId,
      reason,
      description: description.trim(),
      status: PostReportStatus.PENDING,
      createdAt: serverTimestamp(),
    };

    // Firestoreに保存
    const docRef = await addDoc(reportsRef, reportData);

    // 通報者に受付通知を送信
    await addDoc(collection(db, 'userNotifications'), {
      userId: user.uid,
      title: '通報を受け付けました',
      message: 'ご報告いただいた内容を確認しております。運営側で適切に対応させていただきます。結果については別途ご連絡いたします。',
      type: 'info',
      read: false,
      createdAt: serverTimestamp(),
      relatedReportId: docRef.id,
      relatedReportType: 'post'
    });

    return NextResponse.json({
      success: true,
      reportId: docRef.id,
      message: '通報を受け付けました。ご報告いただきありがとうございます。'
    });

  } catch (error) {
    console.error('Post report submission error:', error);
    
    return NextResponse.json(
      { error: '通報の送信に失敗しました。しばらくしてから再度お試しください。' },
      { status: 500 }
    );
  }
}