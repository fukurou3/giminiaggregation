// 投稿画像のクロップメタデータ型定義
export interface CropMeta {
  // クロップ座標（EXIF補正後の画像座標系）
  x: number;      // クロップ開始X座標
  y: number;      // クロップ開始Y座標  
  w: number;      // クロップ幅
  h: number;      // クロップ高さ
  
  // 変形パラメータ
  angle: number;  // 回転角度（度）
  scale: number;  // スケール倍率
  
  // 元画像情報
  naturalWidth: number;   // 元画像の幅
  naturalHeight: number;  // 元画像の高さ
  
  // クロップ設定
  ratio: '5:3' | '1:1';   // アスペクト比
}

// クロップメタデータ生成ユーティリティ
export function generateCropMeta(
  imageWidth: number,
  imageHeight: number,
  aspectRatio: number = 5/3,
  mode: 'post' | 'avatar' | 'thumbnail' | 'pr' = 'post'
): CropMeta {
  // 5:3比率でセンタークロップの座標を計算
  let cropX = 0;
  let cropY = 0;
  let cropWidth = imageWidth;
  let cropHeight = imageHeight;
  
  const currentRatio = imageWidth / imageHeight;
  
  if (currentRatio > aspectRatio) {
    // 横長画像: 高さを基準に幅を調整
    cropWidth = imageHeight * aspectRatio;
    cropX = (imageWidth - cropWidth) / 2;
  } else if (currentRatio < aspectRatio) {
    // 縦長画像: 幅を基準に高さを調整
    cropHeight = imageWidth / aspectRatio;
    cropY = (imageHeight - cropHeight) / 2;
  }
  
  return {
    x: Math.round(cropX),
    y: Math.round(cropY),
    w: Math.round(cropWidth),
    h: Math.round(cropHeight),
    angle: 0,
    scale: 1,
    naturalWidth: imageWidth,
    naturalHeight: imageHeight,
    ratio: mode === 'avatar' ? '1:1' : '5:3'
  };
}

// クロップメタデータの検証
export function validateCropMeta(cropMeta: CropMeta): boolean {
  return (
    cropMeta.x >= 0 &&
    cropMeta.y >= 0 &&
    cropMeta.w > 0 &&
    cropMeta.h > 0 &&
    cropMeta.x + cropMeta.w <= cropMeta.naturalWidth &&
    cropMeta.y + cropMeta.h <= cropMeta.naturalHeight &&
    cropMeta.naturalWidth > 0 &&
    cropMeta.naturalHeight > 0 &&
    (cropMeta.ratio === '5:3' || cropMeta.ratio === '1:1')
  );
}