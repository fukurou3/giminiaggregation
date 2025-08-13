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
exports.processUploadedImage = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
// Using Firebase Admin SDK for storage access
const sharp_1 = __importDefault(require("sharp"));
const crypto_1 = require("crypto");
// 定数定義
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
const MAX_PIXELS = 25 * 1024 * 1024; // 25MP (DoS対策)
const MAX_FRAMES = 300; // フレーム数上限 (アニメーションGIF等)
const WEBP_QUALITY = 80;
// Processing modes configuration
const PROCESSING_MODES = {
    post: {
        aspectRatio: 5 / 3,
        maxDimension: 1200,
        outputSizes: [1200] // Single size for posts
    },
    avatar: {
        aspectRatio: 1, // 1:1 for square avatars
        maxDimension: 512,
        outputSizes: [256, 512] // Multiple sizes for avatars
    }
};
// Magic bytes for image verification
const MAGIC_BYTES = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/webp': [0x52, 0x49, 0x46, 0x46]
};
/**
 * Storage onFinalize trigger for image processing
 * Monitors /tmp/ uploads and processes them to /public/
 */
exports.processUploadedImage = functions
    .storage
    .object()
    .onFinalize(async (object) => {
    const { name: filePath, bucket: bucketName } = object;
    // Only process files in /tmp/ directory
    if (!filePath || !filePath.startsWith('tmp/')) {
        console.log(`Skipping non-tmp file: ${filePath}`);
        return null;
    }
    // Extract mode from file path (tmp/sessionId/mode_filename.jpg)
    const pathParts = filePath.split('/');
    let mode = 'post'; // Default to post mode
    if (pathParts.length >= 3) {
        const fileName = pathParts[2];
        if (fileName.startsWith('avatar_')) {
            mode = 'avatar';
        }
        else if (fileName.startsWith('post_')) {
            mode = 'post';
        }
    }
    console.log(`Processing image: ${filePath} (mode: ${mode})`);
    try {
        // Use Firebase Admin SDK to get the default bucket
        const bucket = admin.storage().bucket(bucketName);
        const file = bucket.file(filePath);
        // Download file for processing
        const [fileBuffer] = await file.download();
        // Process the image with mode
        const result = await processImageBuffer(fileBuffer, filePath, mode);
        if (result.success && (result.publicUrl || result.publicUrls) && result.contentHash) {
            // Save metadata to Firestore
            await saveImageMetadata(filePath, result);
            // Clean up tmp file immediately after success
            await cleanupTmpFile(file, filePath);
            console.log(`Successfully processed and cleaned up: ${filePath}`);
        }
        else {
            console.error(`Processing failed for ${filePath}:`, result.error);
            // Mark as failed and schedule cleanup (keep for limited time for debugging)
            await markImageAsFailed(filePath, result.error || 'Unknown error');
            await scheduleFailedFileCleanup(file, filePath);
        }
        return result;
    }
    catch (error) {
        console.error(`Error processing ${filePath}:`, error);
        await markImageAsFailed(filePath, `Processing error: ${error}`);
        // Cleanup tmp file even on error
        try {
            const bucket = admin.storage().bucket(bucketName);
            const file = bucket.file(filePath);
            await scheduleFailedFileCleanup(file, filePath);
        }
        catch (cleanupError) {
            console.error(`Failed to schedule cleanup for ${filePath}:`, cleanupError);
        }
        return { success: false, error: `Processing error: ${error}` };
    }
});
/**
 * Process image buffer with security checks and conversion
 */
async function processImageBuffer(buffer, originalPath, mode = 'post') {
    try {
        // 1. Basic security checks
        const securityCheck = await performSecurityChecks(buffer);
        if (!securityCheck.valid) {
            return { success: false, error: securityCheck.error };
        }
        // 2. Get image metadata
        const metadata = await (0, sharp_1.default)(buffer).metadata();
        if (!metadata.width || !metadata.height) {
            return { success: false, error: 'Cannot determine image dimensions' };
        }
        // 3. Check pixel count
        const totalPixels = metadata.width * metadata.height;
        if (totalPixels > MAX_PIXELS) {
            return { success: false, error: `Image too large: ${totalPixels} pixels (max: ${MAX_PIXELS})` };
        }
        // 4. Check frame count for animated images
        if (metadata.pages && metadata.pages > MAX_FRAMES) {
            return { success: false, error: `Too many frames: ${metadata.pages} (max: ${MAX_FRAMES})` };
        }
        // 5. Generate content hash
        const contentHash = (0, crypto_1.createHash)('sha256').update(buffer).digest('hex').substring(0, 16);
        // 6. Process image based on mode
        const modeConfig = PROCESSING_MODES[mode];
        if (mode === 'avatar') {
            // Avatar mode: generate multiple sizes
            const processedUrls = [];
            const sizeUrlMap = {};
            for (const size of modeConfig.outputSizes) {
                const processedBuffer = await processImageToWebP(buffer, metadata, mode, size);
                const publicUrl = await uploadToPublicStorage(processedBuffer, `${contentHash}_${size}`, mode);
                processedUrls.push(publicUrl);
                sizeUrlMap[size] = publicUrl;
            }
            // Get metadata from the largest size
            const largestBuffer = await processImageToWebP(buffer, metadata, mode, Math.max(...modeConfig.outputSizes));
            const finalMetadata = await (0, sharp_1.default)(largestBuffer).metadata();
            return {
                success: true,
                publicUrls: processedUrls,
                contentHash,
                mode,
                metadata: {
                    width: finalMetadata.width || 0,
                    height: finalMetadata.height || 0,
                    size: largestBuffer.length,
                    format: 'webp',
                    sizes: sizeUrlMap
                }
            };
        }
        else {
            // Post mode: single size (backward compatibility)
            const processedBuffer = await processImageToWebP(buffer, metadata, mode);
            const publicUrl = await uploadToPublicStorage(processedBuffer, contentHash, mode);
            const finalMetadata = await (0, sharp_1.default)(processedBuffer).metadata();
            return {
                success: true,
                publicUrl,
                contentHash,
                mode,
                metadata: {
                    width: finalMetadata.width || 0,
                    height: finalMetadata.height || 0,
                    size: processedBuffer.length,
                    format: 'webp'
                }
            };
        }
    }
    catch (error) {
        return { success: false, error: `Image processing failed: ${error}` };
    }
}
/**
 * Perform security checks on image buffer
 */
async function performSecurityChecks(buffer) {
    // Check file size
    if (buffer.length > MAX_FILE_SIZE) {
        return { valid: false, error: `File too large: ${buffer.length} bytes (max: ${MAX_FILE_SIZE})` };
    }
    // Verify magic bytes
    let validMagicBytes = false;
    for (const [mimeType, magicBytes] of Object.entries(MAGIC_BYTES)) {
        if (buffer.length >= magicBytes.length) {
            const match = magicBytes.every((byte, index) => buffer[index] === byte);
            if (match) {
                validMagicBytes = true;
                break;
            }
        }
    }
    if (!validMagicBytes) {
        return { valid: false, error: 'Invalid file format or corrupted file' };
    }
    return { valid: true };
}
/**
 * Process image to WebP with mode-specific aspect ratio and size
 */
async function processImageToWebP(buffer, metadata, mode = 'post', targetSize) {
    const { width, height } = metadata;
    if (!width || !height) {
        throw new Error('Invalid image dimensions');
    }
    const modeConfig = PROCESSING_MODES[mode];
    const targetAspectRatio = modeConfig.aspectRatio;
    const maxDimension = targetSize || modeConfig.maxDimension;
    // Calculate crop dimensions for target aspect ratio
    const currentRatio = width / height;
    let cropWidth = width;
    let cropHeight = height;
    let left = 0;
    let top = 0;
    if (currentRatio > targetAspectRatio) {
        // Image is wider than target ratio - crop width
        cropWidth = Math.round(height * targetAspectRatio);
        left = Math.round((width - cropWidth) / 2);
    }
    else if (currentRatio < targetAspectRatio) {
        // Image is taller than target ratio - crop height
        cropHeight = Math.round(width / targetAspectRatio);
        top = Math.round((height - cropHeight) / 2);
    }
    // Calculate resize dimensions
    let resizeWidth;
    let resizeHeight;
    if (mode === 'avatar') {
        // For avatar mode, both width and height should be the same (square)
        resizeWidth = resizeHeight = Math.min(maxDimension, Math.min(cropWidth, cropHeight));
    }
    else {
        // For post mode, maintain aspect ratio
        resizeWidth = Math.min(maxDimension, cropWidth);
        resizeHeight = Math.round(resizeWidth / targetAspectRatio);
    }
    return (0, sharp_1.default)(buffer)
        .extract({ left, top, width: cropWidth, height: cropHeight })
        .resize(resizeWidth, resizeHeight, {
        fit: 'fill',
        kernel: sharp_1.default.kernel.lanczos3
    })
        .toColorspace('srgb')
        .webp({
        quality: WEBP_QUALITY,
        effort: 6,
        smartSubsample: true
    })
        .toBuffer();
}
/**
 * Upload processed image to public storage
 */
async function uploadToPublicStorage(buffer, contentHash, mode = 'post') {
    const bucket = admin.storage().bucket(); // Use default Firebase Storage bucket
    // Create mode-specific path structure
    const fileName = mode === 'avatar'
        ? `public/avatars/${contentHash}.webp`
        : `public/posts/${contentHash}.webp`;
    const file = bucket.file(fileName);
    await file.save(buffer, {
        metadata: {
            contentType: 'image/webp',
            cacheControl: 'public, max-age=31536000, immutable',
            metadata: {
                processedAt: new Date().toISOString(),
                contentHash,
                format: 'webp',
                mode
            }
        }
    });
    // Return public HTTPS URL instead of gs:// URL
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
}
/**
 * Save image metadata to Firestore
 */
async function saveImageMetadata(originalPath, result) {
    if (!result.contentHash || !result.metadata)
        return;
    const db = admin.firestore();
    const imageDoc = db.collection('processedImages').doc(result.contentHash);
    const firestoreData = {
        contentHash: result.contentHash,
        originalPath,
        metadata: result.metadata,
        mode: result.mode || 'post',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'processed'
    };
    // Add URLs based on mode
    if (result.mode === 'avatar' && result.publicUrls) {
        firestoreData.publicUrls = result.publicUrls;
        firestoreData.sizes = result.metadata.sizes;
    }
    else if (result.publicUrl) {
        firestoreData.publicUrl = result.publicUrl;
    }
    await imageDoc.set(firestoreData);
}
/**
 * Mark image as failed in Firestore
 */
async function markImageAsFailed(originalPath, error) {
    const db = admin.firestore();
    const failedDoc = db.collection('failedImages').doc();
    await failedDoc.set({
        originalPath,
        error,
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'failed',
        cleanupScheduled: false
    });
}
/**
 * Clean up tmp file immediately (success case)
 */
async function cleanupTmpFile(file, filePath) {
    const maxRetries = 3;
    let retryCount = 0;
    while (retryCount < maxRetries) {
        try {
            await file.delete();
            console.log(`Deleted tmp file: ${filePath}`);
            return;
        }
        catch (error) {
            retryCount++;
            console.warn(`Failed to delete tmp file ${filePath} (attempt ${retryCount}/${maxRetries}):`, error);
            if (retryCount < maxRetries) {
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            }
        }
    }
    console.error(`Failed to delete tmp file after ${maxRetries} attempts: ${filePath}`);
}
/**
 * Schedule cleanup for failed tmp file (keep for debugging, delete after delay)
 */
async function scheduleFailedFileCleanup(file, filePath) {
    const db = admin.firestore();
    try {
        // Schedule cleanup in 24 hours
        const cleanupTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.collection('tmpCleanupSchedule').add({
            filePath,
            scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
            cleanupAt: cleanupTime,
            status: 'scheduled'
        });
        console.log(`Scheduled cleanup for failed file: ${filePath} at ${cleanupTime.toISOString()}`);
    }
    catch (error) {
        console.error(`Failed to schedule cleanup for ${filePath}:`, error);
        // Fallback: try immediate cleanup if scheduling fails
        try {
            await file.delete();
            console.log(`Fallback: Immediately deleted failed tmp file: ${filePath}`);
        }
        catch (deleteError) {
            console.error(`Fallback deletion also failed for ${filePath}:`, deleteError);
        }
    }
}
