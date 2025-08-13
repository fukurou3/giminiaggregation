import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';
import * as sharp from 'sharp';
import * as crypto from 'crypto';

interface MigrationResult {
  uid: string;
  success: boolean;
  oldUrl?: string;
  newUrl?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

/**
 * Batch migration of legacy profile images to new pipeline
 * Callable function for admin use
 */
export const migrateProfileImages = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB',
    maxInstances: 5
  })
  .https
  .onCall(async (data, context) => {
    // Verify admin access
    if (!context.auth?.token.admin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { batchSize = 50, startAfter = null, dryRun = false } = data;

    console.log(`Starting profile image migration (batchSize: ${batchSize}, dryRun: ${dryRun})`);

    try {
      const db = admin.firestore();
      const storage = new Storage();
      const bucket = storage.bucket();

      // Get user profiles with legacy profile images
      let query = db.collection('userProfiles')
        .where('photoURL', '!=', null)
        .limit(batchSize);

      if (startAfter) {
        query = query.startAfter(startAfter);
      }

      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return {
          success: true,
          message: 'No more profiles to migrate',
          results: []
        };
      }

      console.log(`Processing ${snapshot.size} profiles for migration`);

      const results: MigrationResult[] = [];
      const batch = db.batch();

      for (const doc of snapshot.docs) {
        const profile = doc.data();
        const uid = doc.id;

        try {
          const migrationResult = await migrateUserProfile(
            uid, 
            profile, 
            storage, 
            bucket, 
            dryRun
          );

          results.push(migrationResult);

          // Update Firestore if migration successful and not dry run
          if (!dryRun && migrationResult.success && migrationResult.newUrl) {
            batch.update(doc.ref, {
              photoURL: migrationResult.newUrl,
              photoURLMigrated: true,
              photoURLMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
              legacyPhotoURL: migrationResult.oldUrl
            });
          }

        } catch (error) {
          console.error(`Migration failed for user ${uid}:`, error);
          results.push({
            uid,
            success: false,
            error: String(error)
          });
        }
      }

      // Commit Firestore updates
      if (!dryRun) {
        await batch.commit();
      }

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success && !r.skipped).length;
      const skippedCount = results.filter(r => r.skipped).length;

      console.log(`Migration batch completed: ${successCount} success, ${errorCount} errors, ${skippedCount} skipped`);

      return {
        success: true,
        summary: {
          total: results.length,
          success: successCount,
          errors: errorCount,
          skipped: skippedCount,
          dryRun
        },
        results,
        nextStartAfter: snapshot.docs[snapshot.docs.length - 1]?.id || null
      };

    } catch (error) {
      console.error('Batch migration failed:', error);
      throw new functions.https.HttpsError('internal', `Migration failed: ${error}`);
    }
  });

/**
 * Migrate a single user profile
 */
async function migrateUserProfile(
  uid: string,
  profile: any,
  storage: any,
  bucket: any,
  dryRun: boolean
): Promise<MigrationResult> {
  
  const photoURL = profile.photoURL;
  
  if (!photoURL) {
    return {
      uid,
      success: false,
      skipped: true,
      reason: 'No profile image'
    };
  }

  // Check if already migrated
  if (profile.photoURLMigrated || photoURL.includes('/public/avatars/')) {
    return {
      uid,
      success: false,
      skipped: true,
      reason: 'Already migrated or using new pipeline'
    };
  }

  // Check if it's a legacy signed URL
  if (!photoURL.includes('storage.googleapis.com') && !photoURL.includes('X-Goog-')) {
    return {
      uid,
      success: false,
      skipped: true,
      reason: 'Not a legacy GCS URL'
    };
  }

  try {
    // Extract file name from legacy URL
    const fileName = extractFileNameFromUrl(photoURL);
    if (!fileName) {
      return {
        uid,
        success: false,
        error: 'Could not extract filename from URL'
      };
    }

    // Try to access the legacy file
    const legacyFile = bucket.file(fileName);
    const [exists] = await legacyFile.exists();
    
    if (!exists) {
      return {
        uid,
        success: false,
        error: 'Legacy file not found'
      };
    }

    if (dryRun) {
      return {
        uid,
        success: true,
        oldUrl: photoURL,
        newUrl: '[DRY_RUN] Would create new avatar URL'
      };
    }

    // Download and process the legacy image
    const [fileBuffer] = await legacyFile.download();
    
    // Process as avatar (1:1, 256px and 512px)
    const processedImages = await processAvatarImage(fileBuffer);
    
    // Generate content hash
    const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16);
    
    // Upload processed images
    const uploadPromises = processedImages.map(async (imageData, index) => {
      const size = index === 0 ? 256 : 512;
      const fileName = `public/avatars/${contentHash}_${size}.webp`;
      const file = bucket.file(fileName);
      
      await file.save(imageData.buffer, {
        metadata: {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000, immutable',
          metadata: {
            processedAt: new Date().toISOString(),
            contentHash,
            format: 'webp',
            mode: 'avatar',
            size: size.toString(),
            migratedFrom: 'legacy-profile-image',
            originalUid: uid
          }
        }
      });

      return `gs://${bucket.name}/${fileName}`;
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    
    // Use the 256px version as the primary URL
    const newUrl = uploadedUrls[0];

    // Save migration metadata
    const db = admin.firestore();
    await db.collection('profileMigrations').add({
      uid,
      oldUrl: photoURL,
      newUrl,
      contentHash,
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      sizes: {
        '256': uploadedUrls[0],
        '512': uploadedUrls[1]
      }
    });

    console.log(`Successfully migrated profile image for user ${uid}`);

    return {
      uid,
      success: true,
      oldUrl: photoURL,
      newUrl
    };

  } catch (error) {
    console.error(`Error migrating profile for user ${uid}:`, error);
    return {
      uid,
      success: false,
      oldUrl: photoURL,
      error: String(error)
    };
  }
}

/**
 * Process image for avatar (1:1 aspect ratio, 256px and 512px)
 */
async function processAvatarImage(buffer: Buffer): Promise<{ buffer: Buffer; size: number }[]> {
  const metadata = await sharp(buffer).metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Cannot determine image dimensions');
  }

  // Calculate crop for 1:1 aspect ratio
  const size = Math.min(metadata.width, metadata.height);
  const left = Math.round((metadata.width - size) / 2);
  const top = Math.round((metadata.height - size) / 2);

  // Generate 256px and 512px versions
  const sizes = [256, 512];
  
  const processedImages = await Promise.all(
    sizes.map(async (targetSize) => {
      const processedBuffer = await sharp(buffer)
        .extract({ left, top, width: size, height: size })
        .resize(targetSize, targetSize, { 
          fit: 'fill',
          kernel: sharp.kernel.lanczos3 
        })
        .toColorspace('srgb')
        .webp({ 
          quality: 80,
          effort: 6,
          smartSubsample: true 
        })
        .toBuffer();

      return {
        buffer: processedBuffer,
        size: targetSize
      };
    })
  );

  return processedImages;
}

/**
 * Extract filename from legacy URL
 */
function extractFileNameFromUrl(url: string): string | null {
  try {
    // Handle various URL formats
    if (url.includes('storage.googleapis.com')) {
      const match = url.match(/\/([^\/\?]+)(?:\?|$)/);
      return match ? decodeURIComponent(match[1]) : null;
    }
    
    // Handle signed URLs
    if (url.includes('/o/')) {
      const match = url.match(/\/o\/([^?]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting filename from URL:', error);
    return null;
  }
}

/**
 * Get migration statistics
 */
export const getMigrationStats = functions
  .https
  .onCall(async (data, context) => {
    if (!context.auth?.token.admin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    try {
      const db = admin.firestore();

      // Count total profiles
      const totalProfiles = await db.collection('userProfiles').count().get();
      
      // Count migrated profiles
      const migratedProfiles = await db.collection('userProfiles')
        .where('photoURLMigrated', '==', true)
        .count()
        .get();

      // Count profiles with legacy URLs
      const legacyProfiles = await db.collection('userProfiles')
        .where('photoURL', '!=', null)
        .where('photoURLMigrated', '!=', true)
        .count()
        .get();

      // Get recent migration records
      const recentMigrations = await db.collection('profileMigrations')
        .orderBy('migratedAt', 'desc')
        .limit(10)
        .get();

      return {
        total: totalProfiles.data().count,
        migrated: migratedProfiles.data().count,
        legacy: legacyProfiles.data().count,
        recentMigrations: recentMigrations.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      };

    } catch (error) {
      console.error('Error getting migration stats:', error);
      throw new functions.https.HttpsError('internal', 'Failed to get stats');
    }
  });