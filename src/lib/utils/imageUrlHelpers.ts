/**
 * Image URL utilities for handling both legacy signed URLs and new CDN URLs
 */

export interface ImageUrlInfo {
  url: string;
  isLegacy: boolean;
  needsRefresh?: boolean;
  expiresAt?: Date;
}

/**
 * Detect if a URL is a legacy signed URL or new CDN URL
 */
export function analyzeImageUrl(url: string): ImageUrlInfo {
  // CDN URLs pattern: gs://bucket/public/avatars/hash.webp or https://cdn-domain/public/avatars/hash.webp
  if (url.includes('/public/avatars/') || url.includes('/public/posts/')) {
    return {
      url,
      isLegacy: false,
      needsRefresh: false
    };
  }
  
  // Legacy signed URLs pattern: contains X-Goog-Expires
  if (url.includes('X-Goog-Expires')) {
    const expiresMatch = url.match(/X-Goog-Expires=(\d+)/);
    const expiresAt = expiresMatch ? new Date(parseInt(expiresMatch[1]) * 1000) : undefined;
    const needsRefresh = expiresAt ? expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000 : true; // Refresh if < 24h left
    
    return {
      url,
      isLegacy: true,
      needsRefresh,
      expiresAt
    };
  }
  
  // Default: treat as legacy if format is unclear
  return {
    url,
    isLegacy: true,
    needsRefresh: true
  };
}

/**
 * Convert GCS URL to CDN URL
 */
export function convertToCdnUrl(gcsUrl: string): string {
  // If already a CDN URL, return as-is
  if (!gcsUrl.startsWith('gs://')) {
    return gcsUrl;
  }
  
  // Convert gs://bucket/public/path to CDN URL
  // This would be configured based on your CDN setup
  const bucketMatch = gcsUrl.match(/^gs:\/\/([^\/]+)\/(.+)$/);
  if (bucketMatch) {
    const [, bucket, path] = bucketMatch;
    // Example CDN transformation - adjust based on your CDN configuration
    return `https://cdn.yourdomain.com/${path}`;
  }
  
  return gcsUrl;
}

/**
 * Get optimized avatar URL with fallback
 */
export function getOptimizedAvatarUrl(
  url: string | undefined, 
  size: 256 | 512 = 256
): string | undefined {
  if (!url) return undefined;
  
  const urlInfo = analyzeImageUrl(url);
  
  // For new CDN URLs, we can request specific sizes
  if (!urlInfo.isLegacy && url.includes('/public/avatars/')) {
    // Extract hash and construct size-specific URL
    const hashMatch = url.match(/\/([a-f0-9]+)(_\d+)?\.webp$/);
    if (hashMatch) {
      const hash = hashMatch[1];
      return url.replace(/\/[a-f0-9]+(_\d+)?\.webp$/, `/${hash}_${size}.webp`);
    }
  }
  
  // For legacy URLs, return as-is
  return url;
}

/**
 * Check if profile image needs migration to new pipeline
 */
export function shouldMigrateImage(url: string | undefined): boolean {
  if (!url) return false;
  const urlInfo = analyzeImageUrl(url);
  return urlInfo.isLegacy;
}

/**
 * Get display-ready avatar URL with size optimization
 */
export function getAvatarDisplayUrl(
  url: string | undefined,
  size: 'small' | 'medium' | 'large' = 'medium'
): string | undefined {
  if (!url) return undefined;
  
  const sizeMap = {
    small: 256,
    medium: 256,
    large: 512
  } as const;
  
  return getOptimizedAvatarUrl(url, sizeMap[size]);
}