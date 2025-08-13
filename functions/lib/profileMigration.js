"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMigrationStats = exports.migrateProfileImages = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
// Using Firebase Admin SDK for storage access
const sharp_1 = __importDefault(require("sharp"));
const crypto_1 = require("crypto");
/**
 * Batch migration of legacy profile images to new pipeline
 * Callable function for admin use
 */
exports.migrateProfileImages = functions
    .https
    .onCall(async (data, context) => {
    var _a, _b;
    // Verify admin access
    if (!((_a = context.auth) === null || _a === void 0 ? void 0 : _a.token.admin)) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    const { batchSize = 50, startAfter = null, dryRun = false } = data;
    console.log(`Starting profile image migration (batchSize: ${batchSize}, dryRun: ${dryRun})`);
    try {
        const db = admin.firestore();
        const bucket = admin.storage().bucket();
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
        const results = [];
        const batch = db.batch();
        for (const doc of snapshot.docs) {
            const profile = doc.data();
            const uid = doc.id;
            try {
                const migrationResult = await migrateUserProfile(uid, profile, bucket, dryRun);
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
            }
            catch (error) {
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
            nextStartAfter: ((_b = snapshot.docs[snapshot.docs.length - 1]) === null || _b === void 0 ? void 0 : _b.id) || null
        };
    }
    catch (error) {
        console.error('Batch migration failed:', error);
        throw new functions.https.HttpsError('internal', `Migration failed: ${error}`);
    }
});
/**
 * Migrate a single user profile
 */
async function migrateUserProfile(uid, profile, bucket, dryRun) {
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
        const contentHash = (0, crypto_1.createHash)('sha256').update(fileBuffer).digest('hex').substring(0, 16);
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
            // Return public HTTPS URL instead of gs:// URL
            return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
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
    }
    catch (error) {
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
async function processAvatarImage(buffer) {
    const metadata = await (0, sharp_1.default)(buffer).metadata();
    if (!metadata.width || !metadata.height) {
        throw new Error('Cannot determine image dimensions');
    }
    // Calculate crop for 1:1 aspect ratio
    const size = Math.min(metadata.width, metadata.height);
    const left = Math.round((metadata.width - size) / 2);
    const top = Math.round((metadata.height - size) / 2);
    // Generate 256px and 512px versions
    const sizes = [256, 512];
    const processedImages = await Promise.all(sizes.map(async (targetSize) => {
        const processedBuffer = await (0, sharp_1.default)(buffer)
            .extract({ left, top, width: size, height: size })
            .resize(targetSize, targetSize, {
            fit: 'fill',
            kernel: sharp_1.default.kernel.lanczos3
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
    }));
    return processedImages;
}
/**
 * Extract filename from legacy URL
 */
function extractFileNameFromUrl(url) {
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
    }
    catch (error) {
        console.error('Error extracting filename from URL:', error);
        return null;
    }
}
/**
 * Get migration statistics
 */
exports.getMigrationStats = functions
    .https
    .onCall(async (data, context) => {
    var _a;
    if (!((_a = context.auth) === null || _a === void 0 ? void 0 : _a.token.admin)) {
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
    }
    catch (error) {
        console.error('Error getting migration stats:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get stats');
    }
});
