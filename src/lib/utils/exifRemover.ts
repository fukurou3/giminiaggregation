/**
 * EXIF metadata removal utility for enhanced security and privacy
 * Removes sensitive metadata from uploaded images
 */

interface ExifRemovalOptions {
  quality?: number; // JPEG quality for re-encoding (0.1 - 1.0)
  preserveColorProfile?: boolean; // Whether to preserve color profile
}

/**
 * Removes EXIF data from an image file by re-encoding it through Canvas
 */
export async function removeExifData(
  file: File,
  options: ExifRemovalOptions = {}
): Promise<File> {
  const { quality = 0.95 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      try {
        // Set canvas size to image dimensions
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Clear any existing content
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw image to canvas (this strips EXIF data)
        ctx.drawImage(img, 0, 0);

        // Convert back to blob with specified quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }

            // Create new file with same name and type
            const cleanFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });

            resolve(cleanFile);
          },
          file.type,
          quality
        );
      } catch (error) {
        reject(error);
      } finally {
        // Clean up
        URL.revokeObjectURL(img.src);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for EXIF removal'));
    };

    // Create object URL and load image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Batch process multiple files to remove EXIF data
 */
export async function removeExifDataBatch(
  files: File[],
  options: ExifRemovalOptions = {}
): Promise<File[]> {
  const results: File[] = [];
  
  // Process files sequentially to avoid overwhelming the browser
  for (const file of files) {
    try {
      const cleanFile = await removeExifData(file, options);
      results.push(cleanFile);
    } catch (error) {
      console.warn(`Failed to remove EXIF data from ${file.name}:`, error);
      // If EXIF removal fails, use original file as fallback
      results.push(file);
    }
  }

  return results;
}

/**
 * Check if a file likely contains EXIF data (basic heuristic)
 * This is a simple check - EXIF removal is still recommended for all images
 */
export function likelyContainsExif(file: File): boolean {
  // EXIF is most common in JPEG files from cameras
  if (file.type === 'image/jpeg') {
    // Heuristic: files over 100KB from cameras often have EXIF
    // This is not definitive, but helps prioritize processing
    return file.size > 100 * 1024;
  }
  
  // PNG and WebP can contain metadata but less commonly
  return false;
}

/**
 * Get basic file info without loading the full image
 */
export async function getImageMetadata(file: File): Promise<{
  width: number;
  height: number;
  aspectRatio: number;
  estimatedExif: boolean;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const metadata = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
        estimatedExif: likelyContainsExif(file)
      };
      
      URL.revokeObjectURL(img.src);
      resolve(metadata);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image metadata'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}