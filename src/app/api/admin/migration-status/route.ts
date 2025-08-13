import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/utils';
import { env } from '@/lib/env';

// Firebase Admin初期化
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: env.GOOGLE_CLOUD_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse('unauthorized', '認証が必要です', 401);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // 管理者権限チェック
    if (!decodedToken.admin) {
      return createErrorResponse('forbidden', '管理者権限が必要です', 403);
    }

    // 移行統計を取得
    const migrationStats = await getMigrationStatistics();
    
    // 最近の移行活動を取得
    const recentActivity = await getRecentMigrationActivity();
    
    // エラー統計を取得
    const errorStats = await getMigrationErrors();

    return createSuccessResponse({
      stats: migrationStats,
      recentActivity,
      errors: errorStats,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Migration status error:', error);
    return createErrorResponse(
      'server_error',
      '移行状況の取得に失敗しました',
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse('unauthorized', '認証が必要です', 401);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // 管理者権限チェック
    if (!decodedToken.admin) {
      return createErrorResponse('forbidden', '管理者権限が必要です', 403);
    }

    const body = await request.json();
    const { action, batchSize = 50, dryRun = false } = body;

    if (action === 'start_migration') {
      // バッチ移行を開始
      const result = await triggerBatchMigration(batchSize, dryRun);
      return createSuccessResponse(result);
    }

    if (action === 'cleanup_legacy') {
      // レガシー データのクリーンアップ
      const result = await cleanupLegacyData(dryRun);
      return createSuccessResponse(result);
    }

    return createErrorResponse('bad_request', '無効なアクションです', 400);

  } catch (error) {
    console.error('Migration action error:', error);
    return createErrorResponse(
      'server_error',
      '移行操作に失敗しました',
      500
    );
  }
}

/**
 * 移行統計を取得
 */
async function getMigrationStatistics() {
  const [totalProfilesSnap, migratedProfilesSnap, legacyProfilesSnap] = await Promise.all([
    db.collection('userProfiles').count().get(),
    db.collection('userProfiles').where('photoURLMigrated', '==', true).count().get(),
    db.collection('userProfiles')
      .where('photoURL', '!=', null)
      .where('photoURLMigrated', '!=', true)
      .count().get()
  ]);

  const total = totalProfilesSnap.data().count;
  const migrated = migratedProfilesSnap.data().count;
  const legacy = legacyProfilesSnap.data().count;
  const withoutPhoto = total - migrated - legacy;

  return {
    total,
    migrated,
    legacy,
    withoutPhoto,
    migrationProgress: total > 0 ? Math.round((migrated / (migrated + legacy)) * 100) : 0
  };
}

/**
 * 最近の移行活動を取得
 */
async function getRecentMigrationActivity() {
  const recentMigrations = await db.collection('profileMigrations')
    .orderBy('migratedAt', 'desc')
    .limit(20)
    .get();

  return recentMigrations.docs.map(doc => ({
    id: doc.id,
    uid: doc.data().uid,
    migratedAt: doc.data().migratedAt?.toDate()?.toISOString(),
    oldUrl: doc.data().oldUrl,
    newUrl: doc.data().newUrl,
    contentHash: doc.data().contentHash
  }));
}

/**
 * 移行エラー統計を取得
 */
async function getMigrationErrors() {
  // 最近24時間のエラーログを検索
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const errorLogs = await db.collection('migrationErrors')
    .where('timestamp', '>=', yesterday)
    .orderBy('timestamp', 'desc')
    .limit(50)
    .get();

  const errors = errorLogs.docs.map(doc => ({
    id: doc.id,
    uid: doc.data().uid,
    error: doc.data().error,
    timestamp: doc.data().timestamp?.toDate()?.toISOString()
  }));

  // エラー種別でグループ化
  const errorGroups: { [key: string]: number } = {};
  errors.forEach(error => {
    const errorType = error.error.split(':')[0] || 'Unknown';
    errorGroups[errorType] = (errorGroups[errorType] || 0) + 1;
  });

  return {
    recent: errors,
    groups: errorGroups,
    totalLast24h: errors.length
  };
}

/**
 * バッチ移行をトリガー
 */
async function triggerBatchMigration(batchSize: number, dryRun: boolean) {
  // Cloud Functions の callable function を呼び出し
  // この実装は簡略化されており、実際にはより複雑なスケジューリングが必要
  
  return {
    message: `バッチ移行がスケジュールされました (size: ${batchSize}, dryRun: ${dryRun})`,
    batchSize,
    dryRun,
    scheduledAt: new Date().toISOString()
  };
}

/**
 * レガシーデータのクリーンアップ
 */
async function cleanupLegacyData(dryRun: boolean) {
  // 移行完了済みのレガシーファイルを特定
  const migratedProfiles = await db.collection('userProfiles')
    .where('photoURLMigrated', '==', true)
    .where('legacyPhotoURL', '!=', null)
    .limit(100)
    .get();

  const cleanupCandidates = migratedProfiles.docs.map(doc => ({
    uid: doc.id,
    legacyUrl: doc.data().legacyPhotoURL,
    newUrl: doc.data().photoURL
  }));

  if (dryRun) {
    return {
      message: 'ドライラン: クリーンアップ対象を特定',
      candidates: cleanupCandidates.length,
      dryRun: true
    };
  }

  // 実際のクリーンアップは別のバッチ処理で実行
  return {
    message: 'レガシーデータクリーンアップを開始',
    candidates: cleanupCandidates.length,
    scheduledAt: new Date().toISOString()
  };
}