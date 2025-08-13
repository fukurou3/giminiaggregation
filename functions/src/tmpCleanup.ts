import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
// Using Firebase Admin SDK for storage access

/**
 * Daily cleanup of tmp files and monitoring
 * Scheduled to run daily at 2:00 AM JST
 */
export const dailyTmpCleanup = functions
  .pubsub
  .schedule('0 2 * * *')  // Daily at 2:00 AM JST
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
    console.log('Starting daily tmp cleanup job');
    
    try {
      const bucket = admin.storage().bucket();
  
      const db = admin.firestore();
      
      // 1. Clean up scheduled failed files
      await cleanupScheduledFiles(db, bucket);
      
      // 2. Clean up orphaned tmp files (older than 24 hours)
      await cleanupOrphanedTmpFiles(bucket);
      
      // 3. Monitor tmp directory metrics
      await monitorTmpMetrics(bucket, db);
      
      console.log('Daily tmp cleanup completed successfully');
      return { success: true };
    } catch (error) {
      console.error('Daily tmp cleanup failed:', error);
      throw error;
    }
  });

/**
 * Clean up files scheduled for cleanup
 */
async function cleanupScheduledFiles(db: admin.firestore.Firestore, bucket: any): Promise<void> {
  const now = new Date();
  
  // Get files scheduled for cleanup
  const scheduledQuery = db.collection('tmpCleanupSchedule')
    .where('status', '==', 'scheduled')
    .where('cleanupAt', '<=', now)
    .limit(100); // Process in batches
    
  const snapshot = await scheduledQuery.get();
  
  if (snapshot.empty) {
    console.log('No scheduled files to clean up');
    return;
  }
  
  console.log(`Processing ${snapshot.size} scheduled files for cleanup`);
  
  const batch = db.batch();
  let deletedCount = 0;
  let errorCount = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const filePath = data.filePath;
    
    try {
      // Try to delete the file
      const file = bucket.file(filePath);
      const [exists] = await file.exists();
      
      if (exists) {
        await file.delete();
        console.log(`Deleted scheduled tmp file: ${filePath}`);
        deletedCount++;
      } else {
        console.log(`Scheduled tmp file already deleted: ${filePath}`);
      }
      
      // Mark as completed
      batch.update(doc.ref, {
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
    } catch (error) {
      console.error(`Failed to delete scheduled file ${filePath}:`, error);
      errorCount++;
      
      // Mark as failed and reschedule
      batch.update(doc.ref, {
        status: 'failed',
        error: String(error),
        retryAt: new Date(Date.now() + 60 * 60 * 1000) // Retry in 1 hour
      });
    }
  }
  
  await batch.commit();
  console.log(`Scheduled cleanup completed: ${deletedCount} deleted, ${errorCount} errors`);
}

/**
 * Clean up orphaned tmp files (fallback for files missed by normal cleanup)
 */
async function cleanupOrphanedTmpFiles(bucket: any): Promise<void> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  // List all files in tmp/ directory
  const [files] = await bucket.getFiles({
    prefix: 'tmp/',
    maxResults: 1000
  });
  
  if (files.length === 0) {
    console.log('No tmp files found');
    return;
  }
  
  console.log(`Found ${files.length} tmp files, checking for orphans`);
  
  let orphanCount = 0;
  let deletedCount = 0;
  let errorCount = 0;
  
  for (const file of files) {
    try {
      const [metadata] = await file.getMetadata();
      const createdTime = new Date(metadata.timeCreated);
      
      // Delete files older than 24 hours
      if (createdTime < oneDayAgo) {
        await file.delete();
        console.log(`Deleted orphaned tmp file: ${file.name} (created: ${createdTime.toISOString()})`);
        orphanCount++;
        deletedCount++;
      }
    } catch (error) {
      console.error(`Failed to process tmp file ${file.name}:`, error);
      errorCount++;
    }
  }
  
  console.log(`Orphan cleanup completed: ${orphanCount} orphans found, ${deletedCount} deleted, ${errorCount} errors`);
}

/**
 * Monitor tmp directory metrics and log for alerting
 */
async function monitorTmpMetrics(bucket: any, db: admin.firestore.Firestore): Promise<void> {
  try {
    // Count tmp files
    const [tmpFiles] = await bucket.getFiles({
      prefix: 'tmp/',
      maxResults: 10000 // Increase if needed
    });
    
    const tmpFileCount = tmpFiles.length;
    
    // Count by age
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    let recentFiles = 0;
    let oldFiles = 0;
    let veryOldFiles = 0;
    let totalSize = 0;
    
    for (const file of tmpFiles) {
      try {
        const [metadata] = await file.getMetadata();
        const createdTime = new Date(metadata.timeCreated);
        const fileSize = parseInt(metadata.size) || 0;
        
        totalSize += fileSize;
        
        if (createdTime > oneHourAgo) {
          recentFiles++;
        } else if (createdTime > oneDayAgo) {
          oldFiles++;
        } else {
          veryOldFiles++;
        }
      } catch (error) {
        console.warn(`Failed to get metadata for ${file.name}:`, error);
      }
    }
    
    // Log metrics for monitoring
    const metrics = {
      tmpFileCount,
      recentFiles, // < 1 hour
      oldFiles,    // 1-24 hours
      veryOldFiles, // > 24 hours (should be 0)
      totalSizeMB: Math.round(totalSize / (1024 * 1024)),
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Save metrics
    await db.collection('tmpMetrics').add(metrics);
    
    // Log for alerting (can be picked up by monitoring systems)
    console.log('TMP_METRICS:', JSON.stringify(metrics));
    
    // Alert if too many old files
    if (veryOldFiles > 10) {
      console.error(`ALERT: ${veryOldFiles} tmp files older than 24 hours detected!`);
    }
    
    if (tmpFileCount > 1000) {
      console.warn(`WARNING: High tmp file count: ${tmpFileCount}`);
    }
    
  } catch (error) {
    console.error('Failed to collect tmp metrics:', error);
  }
}

/**
 * Manual cleanup trigger (for emergency use)
 */
export const manualTmpCleanup = functions
  .https
  .onCall(async (data, context) => {
    // Verify admin access
    if (!context.auth?.token.admin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    
    console.log('Manual tmp cleanup triggered by admin');
    
    try {
      const bucket = admin.storage().bucket();
  
      const db = admin.firestore();
      
      const results = {
        scheduledCleanup: 0,
        orphanCleanup: 0,
        errors: 0
      };
      
      // Force cleanup of all scheduled files
      await cleanupScheduledFiles(db, bucket);
      
      // Force cleanup of all orphaned files
      await cleanupOrphanedTmpFiles(bucket);
      
      // Collect current metrics
      await monitorTmpMetrics(bucket, db);
      
      return { success: true, results };
    } catch (error) {
      console.error('Manual tmp cleanup failed:', error);
      throw new functions.https.HttpsError('internal', 'Cleanup failed');
    }
  });