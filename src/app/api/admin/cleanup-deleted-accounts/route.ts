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
  addDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import admin from 'firebase-admin';

// Firebase Admin SDKの初期化確認
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
  }
}

/**
 * 30日経過した削除予定アカウントの完全削除を実行
 * 定期実行用（Cloud Scheduler + Cloud Functions）
 */
export async function POST(request: NextRequest) {
  try {
    // 管理者認証（必要に応じて実装）
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    
    // Cloud SchedulerからのリクエストかAPIキーでの認証
    if (!apiKey || apiKey !== process.env.CLEANUP_API_KEY) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    console.log('Starting cleanup of deleted accounts...');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 削除予定のユーザーを取得（30日経過）
    const deletionScheduleQuery = query(
      collection(db, 'deletionSchedule'),
      where('status', '==', 'scheduled'),
      where('scheduledDeletionAt', '<=', now)
    );

    const scheduledDeletions = await getDocs(deletionScheduleQuery);
    
    if (scheduledDeletions.empty) {
      console.log('No accounts scheduled for deletion');
      return NextResponse.json({
        success: true,
        message: '削除対象のアカウントはありません',
        processedCount: 0
      });
    }

    const processedAccounts: string[] = [];
    const errors: string[] = [];

    for (const scheduleDoc of scheduledDeletions.docs) {
      const scheduleData = scheduleDoc.data();
      const userId = scheduleData.userId;

      try {
        console.log(`Processing permanent deletion for user: ${userId}`);
        
        const batch = writeBatch(db);
        const deletionLog: string[] = [];

        // 1. ユーザープロフィールの完全削除
        const userProfileRef = doc(db, 'users', userId);
        const userProfileSnap = await getDoc(userProfileRef);
        
        if (userProfileSnap.exists()) {
          const userData = userProfileSnap.data();
          
          // プロフィール画像の削除（Storage）
          if (userData.originalData?.photoURL) {
            try {
              const photoPath = userData.originalData.photoURL.replace(/^.*\/o\//, '').split('?')[0];
              const decodedPath = decodeURIComponent(photoPath);
              await admin.storage().bucket().file(decodedPath).delete();
              deletionLog.push(`Deleted profile image: ${decodedPath}`);
            } catch (error) {
              console.error('Failed to delete profile image:', error);
            }
          }
          
          batch.delete(userProfileRef);
          deletionLog.push('Permanently deleted user profile');
        }

        // 2. 投稿した全ての作品の完全削除
        const postsQuery = query(
          collection(db, 'posts'), 
          where('authorId', '==', userId)
        );
        const postsSnapshot = await getDocs(postsQuery);
        
        for (const postDoc of postsSnapshot.docs) {
          const postData = postDoc.data();
          
          // 投稿の画像削除（Storage）
          if (postData.thumbnail) {
            try {
              const imagePath = postData.thumbnail.replace(/^.*\/o\//, '').split('?')[0];
              const decodedPath = decodeURIComponent(imagePath);
              await admin.storage().bucket().file(decodedPath).delete();
              deletionLog.push(`Deleted post thumbnail: ${decodedPath}`);
            } catch (error) {
              console.error('Failed to delete post thumbnail:', error);
            }
          }

          if (postData.prImages && Array.isArray(postData.prImages)) {
            for (const imageUrl of postData.prImages) {
              try {
                const imagePath = imageUrl.replace(/^.*\/o\//, '').split('?')[0];
                const decodedPath = decodeURIComponent(imagePath);
                await admin.storage().bucket().file(decodedPath).delete();
                deletionLog.push(`Deleted post image: ${decodedPath}`);
              } catch (error) {
                console.error('Failed to delete post image:', error);
              }
            }
          }
          
          batch.delete(doc(db, 'posts', postDoc.id));
          deletionLog.push(`Permanently deleted post: ${postDoc.id}`);
        }

        // 3. すべてのコメントの削除（他人の投稿へのコメント含む）
        const allPostsSnapshot = await getDocs(collection(db, 'posts'));
        
        for (const postDoc of allPostsSnapshot.docs) {
          const userCommentsQuery = query(
            collection(db, 'posts', postDoc.id, 'comments'),
            where('userId', '==', userId)
          );
          const userCommentsSnapshot = await getDocs(userCommentsQuery);
          
          for (const commentDoc of userCommentsSnapshot.docs) {
            batch.delete(doc(db, 'posts', postDoc.id, 'comments', commentDoc.id));
            deletionLog.push(`Permanently deleted comment on post ${postDoc.id}`);
          }
        }

        // 4. いいねの削除
        const likesQuery = query(collection(db, 'likes'), where('userId', '==', userId));
        const likesSnapshot = await getDocs(likesQuery);
        
        for (const likeDoc of likesSnapshot.docs) {
          batch.delete(doc(db, 'likes', likeDoc.id));
          deletionLog.push(`Permanently deleted like: ${likeDoc.id}`);
        }

        // 他のユーザーからのいいねも削除
        const likesToUserQuery = query(collection(db, 'likes'), where('targetUserId', '==', userId));
        const likesToUserSnapshot = await getDocs(likesToUserQuery);
        
        for (const likeDoc of likesToUserSnapshot.docs) {
          batch.delete(doc(db, 'likes', likeDoc.id));
          deletionLog.push(`Permanently deleted like to user: ${likeDoc.id}`);
        }

        // 5. フォロー/フォロワー関係の削除
        const followingQuery = query(collection(db, 'follows'), where('followerId', '==', userId));
        const followingSnapshot = await getDocs(followingQuery);
        
        for (const followDoc of followingSnapshot.docs) {
          batch.delete(doc(db, 'follows', followDoc.id));
          deletionLog.push(`Permanently deleted following relationship: ${followDoc.id}`);
        }

        const followersQuery = query(collection(db, 'follows'), where('followingId', '==', userId));
        const followersSnapshot = await getDocs(followersQuery);
        
        for (const followDoc of followersSnapshot.docs) {
          batch.delete(doc(db, 'follows', followDoc.id));
          deletionLog.push(`Permanently deleted follower relationship: ${followDoc.id}`);
        }

        // 6. 通知の削除
        const notificationsQuery = query(collection(db, 'userNotifications'), where('userId', '==', userId));
        const notificationsSnapshot = await getDocs(notificationsQuery);
        
        for (const notifDoc of notificationsSnapshot.docs) {
          batch.delete(doc(db, 'userNotifications', notifDoc.id));
          deletionLog.push(`Permanently deleted notification: ${notifDoc.id}`);
        }

        // 7. 報告履歴の削除
        const reportsQuery = query(collection(db, 'reports'), where('reporterId', '==', userId));
        const reportsSnapshot = await getDocs(reportsQuery);
        
        for (const reportDoc of reportsSnapshot.docs) {
          batch.delete(doc(db, 'reports', reportDoc.id));
          deletionLog.push(`Permanently deleted report: ${reportDoc.id}`);
        }

        const reportedQuery = query(collection(db, 'reports'), where('targetUserId', '==', userId));
        const reportedSnapshot = await getDocs(reportedQuery);
        
        for (const reportDoc of reportedSnapshot.docs) {
          batch.delete(doc(db, 'reports', reportDoc.id));
          deletionLog.push(`Permanently deleted report against user: ${reportDoc.id}`);
        }

        // 8. お気に入りの削除
        const favoritesQuery = query(collection(db, 'favorites'), where('userId', '==', userId));
        const favoritesSnapshot = await getDocs(favoritesQuery);
        
        for (const favDoc of favoritesSnapshot.docs) {
          batch.delete(doc(db, 'favorites', favDoc.id));
          deletionLog.push(`Permanently deleted favorite: ${favDoc.id}`);
        }

        // 9. 作成したコラムの削除
        const columnsQuery = query(collection(db, 'columns'), where('authorId', '==', userId));
        const columnsSnapshot = await getDocs(columnsQuery);
        
        for (const columnDoc of columnsSnapshot.docs) {
          batch.delete(doc(db, 'columns', columnDoc.id));
          deletionLog.push(`Permanently deleted column: ${columnDoc.id}`);
        }

        // 10. Firebase Authenticationからユーザーを完全削除
        try {
          await admin.auth().deleteUser(userId);
          deletionLog.push('Permanently deleted Firebase Auth user');
        } catch (error) {
          console.error('Failed to delete Firebase Auth user:', error);
          // Auth削除の失敗は致命的ではないので続行
        }

        // 11. 削除スケジュールレコードを完了状態に更新
        batch.update(doc(db, 'deletionSchedule', scheduleDoc.id), {
          status: 'completed',
          completedAt: new Date(),
          finalDeletionLog: deletionLog
        });

        // バッチ処理の実行
        await batch.commit();

        // 12. 完全削除完了の記録を残す（監査ログ）
        await addDoc(collection(db, 'permanentlyDeletedAccounts'), {
          userId,
          originalEmail: scheduleData.userEmail,
          softDeletedAt: scheduleData.softDeletedAt,
          permanentlyDeletedAt: new Date(),
          deletionLog,
          scheduleId: scheduleDoc.id
        });

        processedAccounts.push(userId);
        console.log(`Successfully processed permanent deletion for user: ${userId}`);

      } catch (error) {
        console.error(`Failed to process permanent deletion for user ${userId}:`, error);
        errors.push(`${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const result = {
      success: true,
      message: `${processedAccounts.length}件のアカウントが完全削除されました`,
      processedCount: processedAccounts.length,
      processedAccounts,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('Cleanup completed:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Cleanup process error:', error);
    return NextResponse.json(
      { 
        error: 'クリーンアップ処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}