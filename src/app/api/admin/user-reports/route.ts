import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { authenticateAdmin } from '@/lib/adminAuth';
import { UserReport, UpdateUserReportRequest } from '@/types/UserReport';

// 通報一覧取得
export async function GET(request: NextRequest) {
  try {
    // 管理者認証
    const user = await authenticateAdmin(request);
    if (!user) {
      console.log('Admin authentication failed');
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }
    console.log('Admin authenticated:', user.email);

    // 通報一覧を取得（作成日時の降順）
    const reportsRef = collection(db, 'userReports');
    const reportsQuery = query(reportsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(reportsQuery);

    const reports: UserReport[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserReport[];

    return NextResponse.json({ reports });

  } catch (error) {
    console.error('Get user reports error:', error);
    return NextResponse.json(
      { error: '通報一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 通報ステータス更新
export async function PATCH(request: NextRequest) {
  try {
    // 管理者認証
    const user = await authenticateAdmin(request);
    if (!user) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const { reportId, ...updateData }: { reportId: string } & UpdateUserReportRequest = await request.json();

    if (!reportId) {
      return NextResponse.json(
        { error: 'レポートIDが必要です' },
        { status: 400 }
      );
    }

    // 通報を更新
    const reportRef = doc(db, 'userReports', reportId);
    await updateDoc(reportRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });

    return NextResponse.json({
      success: true,
      message: '通報ステータスを更新しました'
    });

  } catch (error) {
    console.error('Update user report error:', error);
    return NextResponse.json(
      { error: '通報ステータスの更新に失敗しました' },
      { status: 500 }
    );
  }
}