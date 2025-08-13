/**
 * Profile Image Migration Utilities
 * Handles migration from legacy signed URLs to unified CDN pipeline
 */

import { auth } from '@/lib/firebase';
import { analyzeImageUrl, shouldMigrateImage } from './imageUrlHelpers';

interface MigrationResult {
  success: boolean;
  newUrl?: string;
  error?: string;
}

/**
 * Check if user's profile image needs migration
 */
export async function checkProfileImageMigration(userId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/profile-image/check-migration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
      },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      console.warn('Failed to check migration status');
      return false;
    }

    const result = await response.json();
    return result.needsMigration;
  } catch (error) {
    console.warn('Migration check failed:', error);
    return false;
  }
}

/**
 * Trigger migration of legacy profile image to new pipeline
 */
export async function migrateProfileImage(userId: string): Promise<MigrationResult> {
  try {
    const response = await fetch('/api/profile-image/migrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
      },
      body: JSON.stringify({ userId })
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Migration failed'
      };
    }

    return {
      success: true,
      newUrl: result.newUrl
    };
  } catch (error) {
    return {
      success: false,
      error: `Migration error: ${error}`
    };
  }
}

/**
 * Get current profile image info with migration status
 */
export async function getProfileImageInfo(photoURL: string | undefined): Promise<{
  url?: string;
  isLegacy: boolean;
  canMigrate: boolean;
  needsRefresh: boolean;
}> {
  if (!photoURL) {
    return {
      isLegacy: false,
      canMigrate: false,
      needsRefresh: false
    };
  }

  const urlInfo = analyzeImageUrl(photoURL);
  
  return {
    url: photoURL,
    isLegacy: urlInfo.isLegacy,
    canMigrate: urlInfo.isLegacy && !photoURL.includes('profile-'), // Exclude temp uploads
    needsRefresh: urlInfo.needsRefresh || false
  };
}

/**
 * Refresh legacy signed URL if needed
 */
export async function refreshProfileImageUrl(fileName: string): Promise<string | null> {
  try {
    const response = await fetch('/api/refresh-profile-image-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
      },
      body: JSON.stringify({ fileName })
    });

    if (!response.ok) {
      console.warn('Failed to refresh profile image URL');
      return null;
    }

    const result = await response.json();
    return result.url;
  } catch (error) {
    console.warn('URL refresh failed:', error);
    return null;
  }
}

/**
 * Smart profile image URL resolver with fallbacks
 */
export async function resolveProfileImageUrl(
  photoURL: string | undefined,
  fileName?: string
): Promise<string | undefined> {
  if (!photoURL) return undefined;

  const urlInfo = analyzeImageUrl(photoURL);

  // If it's a new CDN URL, return as-is
  if (!urlInfo.isLegacy) {
    return photoURL;
  }

  // If it's a legacy URL that needs refresh, try to refresh
  if (urlInfo.needsRefresh && fileName) {
    const refreshedUrl = await refreshProfileImageUrl(fileName);
    if (refreshedUrl) {
      return refreshedUrl;
    }
  }

  // Return original URL as fallback
  return photoURL;
}