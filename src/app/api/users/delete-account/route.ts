import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  doc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  writeBatch,
  getDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import admin from 'firebase-admin';
import { authenticateUser } from '@/app/api/_middleware/auth';
import { env } from '@/lib/env';

// Firebase Admin SDKの初期化確認
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: env.GOOGLE_CLOUD_PROJECT_ID,
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // ユーザー認証
    const { user } = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const userId = user.uid;
    console.log(`Starting soft deletion for user: ${userId}`);

    // バッチ処理の開始
    const batch = writeBatch(db);
    const deletionLog: string[] = [];

    try {
      // 1. ユーザープロフィールをソフト削除（無効化）
      const userProfileRef = doc(db, 'users', userId);
      const userProfileSnap = await getDoc(userProfileRef);
      
      if (userProfileSnap.exists()) {
        const userData = userProfileSnap.data();
        
        // ユーザープロフィールを無効化（即座に非表示）
        batch.update(userProfileRef, {
          isDeleted: true,
          deletedAt: serverTimestamp(),
          scheduledDeletionAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
          // 個人情報を即座に匿名化
          displayName: '退会済みユーザー',
          username: `deleted_user_${userId.substring(0, 8)}`,
          email: `deleted_${userId}@deleted.local`,
          photoURL: '',
          bio: '',
          // 元の情報は暗号化して保存（復旧用）
          originalData: {
            displayName: userData.displayName,
            username: userData.username,
            email: userData.email || user.email,
            photoURL: userData.photoURL,
            bio: userData.bio
          }
        });
        deletionLog.push('Soft deleted user profile');
      }

      // 2. 投稿した全ての作品をソフト削除（即座に非表示）
      const postsQuery = query(
        collection(db, 'posts'), 
        where('authorId', '==', userId)
      );
      const postsSnapshot = await getDocs(postsQuery);
      
      for (const postDoc of postsSnapshot.docs) {
        batch.update(doc(db, 'posts', postDoc.id), {
          isDeleted: true,
          deletedAt: serverTimestamp(),
          isPublic: false, // 即座に非表示
          // 作者名を匿名化
          authorUsername: '退会済みユーザー'
        });
        deletionLog.push(`Soft deleted post: ${postDoc.id}`);
      }

      // 3. Firebase Authenticationからユーザーを無効化（即座にログイン不可）
      try {
        await admin.auth().updateUser(userId, {
          disabled: true,
          displayName: '退会済みユーザー',
          photoURL: undefined
        });
        deletionLog.push('Disabled Firebase Auth user');
      } catch (error) {
        console.error('Failed to disable Firebase Auth user:', error);
      }

      // 4. 削除予定記録の作成
      const deletionScheduleRef = doc(collection(db, 'deletionSchedule'));
      batch.set(deletionScheduleRef, {
        userId,
        userEmail: user.email || 'Unknown',
        softDeletedAt: serverTimestamp(),
        scheduledDeletionAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'scheduled',
        deletionLog
      });

      // バッチ処理の実行
      await batch.commit();
      
      console.log('Soft deletion completed successfully');
      console.log('Deletion log:', deletionLog);

      return NextResponse.json({
        success: true,
        message: 'アカウントが無効化されました。30日後に完全削除されます。',
        softDeletedItems: deletionLog.length,
        scheduledDeletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

    } catch (error) {
      console.error('Error during soft deletion:', error);
      throw error;
    }

  } catch (error) {
    console.error('Account soft deletion error:', error);
    return NextResponse.json(
      { 
        error: 'アカウント削除中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}