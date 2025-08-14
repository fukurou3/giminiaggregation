import { uploadImageToStorage } from './storageUtils';

/**
 * blob URLをFirebase Storage URLに変換する共通処理
 */
export async function uploadBlobImage(
  blobUrl: string,
  userId: string,
  fileName: string,
  mode: 'thumbnail' | 'pr' | 'post' | 'avatar'
): Promise<string> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  const file = new File([blob], fileName, { type: 'image/jpeg' });
  
  const uploadResult = await uploadImageToStorage(file, {
    userId,
    folder: 'post-images',
    mode
  });
  
  return uploadResult.url;
}

/**
 * サムネイル画像のアップロード処理
 */
export async function uploadThumbnailIfNeeded(
  thumbnailUrl: string | undefined,
  userId: string
): Promise<string | undefined> {
  if (!thumbnailUrl) return undefined;
  
  if (thumbnailUrl.startsWith('blob:')) {
    return uploadBlobImage(thumbnailUrl, userId, 'thumbnail.jpg', 'thumbnail');
  }
  
  return thumbnailUrl;
}

/**
 * PR画像のアップロード処理
 */
export async function uploadPrImagesIfNeeded(
  prImages: string[] | undefined,
  userId: string
): Promise<string[]> {
  if (!prImages || prImages.length === 0) return [];
  
  const uploadPromises = prImages.map(async (imageUrl, index) => {
    if (imageUrl.startsWith('blob:')) {
      return uploadBlobImage(imageUrl, userId, `pr-image-${index}.jpg`, 'pr');
    }
    return imageUrl;
  });
  
  return Promise.all(uploadPromises);
}